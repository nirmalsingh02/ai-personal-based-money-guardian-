from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from database.mongo_client import connect_to_mongo, close_mongo
from database.sqlite_client import init_db
from routers import auth, daily_needs, transactions, investment, future_goals, ai_chat
import uvicorn


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    print("🚀 Starting AI Financial Guardian...")
    await connect_to_mongo()
    await init_db()
    print("✅ All databases initialized")
    yield
    print("🔌 Shutting down...")
    await close_mongo()


app = FastAPI(
    title="AI Financial Guardian API",
    description="AI-powered personal finance management with Groq LLM",
    version="1.0.0",
    lifespan=lifespan
)

# CORS - allow frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5174",
    "http://127.0.0.1:5174","http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173","http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all routers
app.include_router(auth.router)
app.include_router(daily_needs.router)
app.include_router(transactions.router)
app.include_router(investment.router)
app.include_router(future_goals.router)
app.include_router(ai_chat.router)


@app.get("/")
async def root():
    return {
        "message": "AI Financial Guardian API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs"
    }


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "AI Financial Guardian"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)