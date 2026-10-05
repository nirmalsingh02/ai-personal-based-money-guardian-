from fastapi import APIRouter, HTTPException, Depends
from database.mongo_client import get_db
from services.groq_service import get_onboarding_questions, chat_with_ai
from models.user import OnboardingData, OnboardingAnswer
from datetime import datetime, timezone
from typing import List

router = APIRouter(prefix="/api/onboarding", tags=["onboarding"])


@router.get("/questions")
async def get_questions():
    """Get the onboarding questions"""
    questions = await get_onboarding_questions()
    return {"questions": questions, "total": len(questions)}


@router.post("/submit")
async def submit_onboarding(data: OnboardingData):
    """Store onboarding answers in MongoDB"""
    db = get_db()

    # Calculate estimated monthly expenses from answers
    monthly_expenses = 0.0
    for answer in data.answers:
        try:
            amount = float(answer.answer)
            category = answer.category
            key = answer.question

            # Convert daily amounts to monthly
            if "per day" in answer.question.lower() or "daily" in key.lower():
                monthly_expenses += amount * 30
            else:
                monthly_expenses += amount
        except (ValueError, TypeError):
            pass

    onboarding_doc = {
        "user_id": data.user_id,
        "answers": [{"question": a.question, "answer": a.answer, "category": a.category} for a in data.answers],
        "estimated_monthly_expenses": round(monthly_expenses, 2),
        "completed_at": datetime.now(timezone.utc)
    }

    # Upsert - store once, update if exists
    await db.onboarding.update_one(
        {"user_id": data.user_id},
        {"$set": onboarding_doc},
        upsert=True
    )

    # Mark user as onboarding complete
    await db.users.update_one(
        {"user_id": data.user_id},
        {"$set": {"onboarding_complete": True, "updated_at": datetime.now(timezone.utc)}}
    )

    return {
        "message": "Onboarding complete!",
        "estimated_monthly_expenses": round(monthly_expenses, 2)
    }


@router.get("/{user_id}")
async def get_onboarding_data(user_id: str):
    """Get stored onboarding data"""
    db = get_db()
    data = await db.onboarding.find_one({"user_id": user_id}, {"_id": 0})
    if not data:
        return {"has_data": False}
    return {"has_data": True, **data}


@router.post("/ai-next-question")
async def get_next_ai_question(payload: dict):
    """Use AI to generate contextual follow-up questions"""
    user_id = payload.get("user_id")
    context = payload.get("context", "")
    previous_answers = payload.get("previous_answers", [])

    prompt = f"""Based on these financial details already collected:
{chr(10).join([f'- {a["question"]}: {a["answer"]}' for a in previous_answers[-3:]])}

Generate ONE natural follow-up question to better understand their spending habits.
Context hint: {context}
Return ONLY the question text, nothing else."""

    response = await chat_with_ai(user_id, prompt, context_type="onboarding")
    return {"question": response.strip()}
