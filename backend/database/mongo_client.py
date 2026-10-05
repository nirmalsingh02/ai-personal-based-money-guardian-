from motor.motor_asyncio import AsyncIOMotorClient
import os
import json
import asyncio
from typing import Any, Dict, List, Optional
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "ai_financial_guardian")

client: Optional[AsyncIOMotorClient] = None
db = None
is_mock = False


class InMemoryCursor:
    def __init__(self, data: List[Dict[str, Any]]):
        self._data = list(data)
        self._limit = None

    def sort(self, key_or_list, direction=1):
        if isinstance(key_or_list, str):
            key = key_or_list
            reverse = direction == -1
        elif isinstance(key_or_list, list) and key_or_list:
            key = key_or_list[0][0]
            reverse = key_or_list[0][1] == -1
        else:
            return self

        def sort_val(doc):
            v = doc.get(key)
            if v is None:
                return ""
            if isinstance(v, datetime):
                return v.isoformat()
            return str(v)

        self._data.sort(key=sort_val, reverse=reverse)
        return self

    def limit(self, n: int):
        self._limit = n
        return self

    async def to_list(self, length: Optional[int] = None):
        limit = length if length is not None else self._limit
        if limit is not None:
            return [dict(d) for d in self._data[:limit]]
        return [dict(d) for d in self._data]

    def __aiter__(self):
        self._iter = iter(self._data[:self._limit] if self._limit else self._data)
        return self

    async def __anext__(self):
        try:
            return next(self._iter)
        except StopIteration:
            raise StopAsyncIteration


class InMemoryCollection:
    def __init__(self, name: str, filepath: str):
        self.name = name
        self.filepath = filepath
        self._docs: List[Dict[str, Any]] = []
        self._load()

    def _load(self):
        try:
            if os.path.exists(self.filepath):
                with open(self.filepath, "r", encoding="utf-8") as f:
                    self._docs = json.load(f)
        except Exception:
            self._docs = []

    def _save(self):
        try:
            os.makedirs(os.path.dirname(self.filepath), exist_ok=True)
            with open(self.filepath, "w", encoding="utf-8") as f:
                json.dump(self._docs, f, default=str, indent=2)
        except Exception:
            pass

    def _matches(self, doc: Dict[str, Any], query: Dict[str, Any]) -> bool:
        for k, v in query.items():
            if doc.get(k) != v:
                return False
        return True

    async def create_index(self, key, unique=False):
        return key

    async def find_one(self, *args, **kwargs):
        query = args[0] if len(args) > 0 else kwargs.get("filter", kwargs.get("query", {}))
        q = query or {}
        for d in self._docs:
            if self._matches(d, q):
                res = dict(d)
                if "_id" not in res:
                    res["_id"] = res.get("user_id", "id_0")
                return res
        return None

    def find(self, *args, **kwargs):
        query = args[0] if len(args) > 0 else kwargs.get("filter", kwargs.get("query", {}))
        sort_arg = kwargs.get("sort", None)
        limit_arg = kwargs.get("limit", None)

        q = query or {}
        matches = [d for d in self._docs if self._matches(d, q)]
        cursor = InMemoryCursor(matches)
        if sort_arg is not None:
            cursor.sort(sort_arg)
        if limit_arg is not None:
            cursor.limit(limit_arg)
        return cursor

    async def insert_one(self, doc: Dict[str, Any]):
        new_doc = dict(doc)
        if "_id" not in new_doc:
            new_doc["_id"] = str(len(self._docs) + 1)
        self._docs.append(new_doc)
        self._save()

        class InsertResult:
            inserted_id = new_doc["_id"]

        return InsertResult()

    async def update_one(self, query: Dict[str, Any], update: Dict[str, Any], upsert: bool = False):
        set_vals = update.get("$set", {})
        for idx, d in enumerate(self._docs):
            if self._matches(d, query):
                d.update(set_vals)
                self._save()

                class UpdateResult:
                    matched_count = 1
                    modified_count = 1
                return UpdateResult()

        if upsert:
            new_doc = dict(query)
            new_doc.update(set_vals)
            new_doc["_id"] = str(len(self._docs) + 1)
            self._docs.append(new_doc)
            self._save()

            class UpsertResult:
                matched_count = 0
                modified_count = 1
                upserted_id = new_doc["_id"]
            return UpsertResult()

        class NoOpResult:
            matched_count = 0
            modified_count = 0
        return NoOpResult()

    async def delete_many(self, query: Dict[str, Any]):
        initial_len = len(self._docs)
        self._docs = [d for d in self._docs if not self._matches(d, query)]
        self._save()

        class DeleteResult:
            deleted_count = initial_len - len(self._docs)
        return DeleteResult()

    async def count_documents(self, query: Dict[str, Any]) -> int:
        return sum(1 for d in self._docs if self._matches(d, query))


class InMemoryDB:
    def __init__(self, data_dir: str = "./data_mongo"):
        self.data_dir = data_dir
        self.users = InMemoryCollection("users", os.path.join(data_dir, "users.json"))
        self.conversations = InMemoryCollection("conversations", os.path.join(data_dir, "conversations.json"))
        self.onboarding = InMemoryCollection("onboarding", os.path.join(data_dir, "onboarding.json"))


async def connect_to_mongo():
    global client, db, is_mock
    try:
        # Try connecting with a 2-second timeout
        temp_client = AsyncIOMotorClient(MONGODB_URL, serverSelectionTimeoutMS=2000)
        await temp_client.admin.command("ping")
        client = temp_client
        db = client[MONGODB_DB_NAME]
        await db.users.create_index("user_id", unique=True)
        await db.conversations.create_index("user_id")
        await db.onboarding.create_index("user_id", unique=True)
        is_mock = False
        print(f"✅ Connected to MongoDB instance: {MONGODB_DB_NAME}")
    except Exception as e:
        # Graceful in-memory persistent JSON fallback
        print(f"⚠️ MongoDB not active on {MONGODB_URL} ({e}). Using file-persisted data store for memory.")
        db = InMemoryDB()
        is_mock = True
        print("✅ Local Mongo memory store initialized successfully")


async def close_mongo():
    global client
    if client:
        client.close()
        print("🔌 MongoDB connection closed")


def get_db():
    return db
