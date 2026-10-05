from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class ConversationMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str
    timestamp: Optional[datetime] = None


class ChatRequest(BaseModel):
    user_id: str
    message: str
    context_type: Optional[str] = "general"  # general, investment, daily, goals


class ChatResponse(BaseModel):
    user_id: str
    response: str
    context_type: str
    timestamp: datetime


class ConversationHistory(BaseModel):
    user_id: str
    messages: List[ConversationMessage]
    total_messages: int
