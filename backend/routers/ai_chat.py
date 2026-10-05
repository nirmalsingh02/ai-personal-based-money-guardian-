from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from models.conversation import ChatRequest, ChatResponse
from services.groq_service import chat_with_ai
from database.mongo_client import get_db
from datetime import datetime, timezone
from typing import List
import json

router = APIRouter(prefix="/api/chat", tags=["chat"])

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.active_connections[user_id] = websocket

    def disconnect(self, user_id: str):
        self.active_connections.pop(user_id, None)

    async def send_message(self, user_id: str, message: dict):
        ws = self.active_connections.get(user_id)
        if ws:
            await ws.send_text(json.dumps(message))


manager = ConnectionManager()


@router.post("/message")
async def send_message(request: ChatRequest):
    """Send a message to AI and get response"""
    response_text = await chat_with_ai(
        user_id=request.user_id,
        user_message=request.message,
        context_type=request.context_type or "general"
    )

    return ChatResponse(
        user_id=request.user_id,
        response=response_text,
        context_type=request.context_type or "general",
        timestamp=datetime.now(timezone.utc)
    )


@router.get("/history/{user_id}")
async def get_history(user_id: str, limit: int = 20, context_type: str = "general"):
    """Get conversation history"""
    db = get_db()
    cursor = db.conversations.find(
        {"user_id": user_id, "context_type": context_type},
        {"_id": 0},
        sort=[("timestamp", -1)],
        limit=limit
    )
    messages = await cursor.to_list(length=limit)
    messages.reverse()
    return {
        "messages": messages,
        "count": len(messages)
    }


@router.delete("/history/{user_id}")
async def clear_history(user_id: str, context_type: str = "general"):
    """Clear conversation history"""
    db = get_db()
    result = await db.conversations.delete_many(
        {"user_id": user_id, "context_type": context_type}
    )
    return {"deleted": result.deleted_count}


@router.websocket("/ws/{user_id}")
async def websocket_chat(websocket: WebSocket, user_id: str):
    """WebSocket endpoint for real-time chat"""
    await manager.connect(websocket, user_id)
    try:
        while True:
            data = await websocket.receive_text()
            payload = json.loads(data)
            message = payload.get("message", "")
            context_type = payload.get("context_type", "general")

            # Send typing indicator
            await manager.send_message(user_id, {"type": "typing", "status": True})

            response = await chat_with_ai(user_id, message, context_type)

            await manager.send_message(user_id, {
                "type": "message",
                "role": "assistant",
                "content": response,
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
    except WebSocketDisconnect:
        manager.disconnect(user_id)
