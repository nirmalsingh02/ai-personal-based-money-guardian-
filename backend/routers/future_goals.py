from fastapi import APIRouter, HTTPException
from database.sqlite_client import AsyncSessionLocal, Goal
from models.transaction import GoalCreate, GoalUpdate
from services.financial_calc import calculate_goal_progress, get_monthly_summary
from services.groq_service import generate_goal_advice
from database.mongo_client import get_db
from sqlalchemy import select, and_
from datetime import datetime, timezone
from typing import Optional

router = APIRouter(prefix="/api/goals", tags=["goals"])


@router.post("/")
async def create_goal(goal: GoalCreate):
    """Create a new financial goal"""
    async with AsyncSessionLocal() as session:
        db_goal = Goal(
            user_id=goal.user_id,
            title=goal.title,
            description=goal.description,
            target_amount=goal.target_amount,
            saved_amount=goal.saved_amount,
            target_date=goal.target_date,
            is_completed=False,
            created_at=datetime.now(timezone.utc)
        )
        session.add(db_goal)
        await session.commit()
        await session.refresh(db_goal)

        progress = await calculate_goal_progress(db_goal)
        return {
            "id": db_goal.id,
            "message": "Goal created!",
            "title": db_goal.title,
            "target_amount": db_goal.target_amount,
            **progress
        }


@router.get("/{user_id}")
async def get_goals(user_id: str, include_completed: bool = False):
    """Get all goals for a user"""
    async with AsyncSessionLocal() as session:
        query = select(Goal).where(Goal.user_id == user_id)
        if not include_completed:
            query = query.where(Goal.is_completed == False)

        result = await session.execute(query)
        goals = result.scalars().all()

        goals_data = []
        for g in goals:
            progress = await calculate_goal_progress(g)
            goals_data.append({
                "id": g.id,
                "title": g.title,
                "description": g.description,
                "target_amount": g.target_amount,
                "saved_amount": g.saved_amount,
                "target_date": g.target_date.isoformat() if g.target_date else None,
                "is_completed": g.is_completed,
                "created_at": g.created_at.isoformat(),
                **progress
            })

        return {"goals": goals_data, "count": len(goals_data)}


@router.patch("/{goal_id}")
async def update_goal(goal_id: int, user_id: str, update: GoalUpdate):
    """Update a goal (add savings, etc.)"""
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(Goal).where(and_(Goal.id == goal_id, Goal.user_id == user_id))
        )
        goal = result.scalar_one_or_none()
        if not goal:
            raise HTTPException(status_code=404, detail="Goal not found")

        if update.saved_amount is not None:
            goal.saved_amount = update.saved_amount
            goal.is_completed = goal.saved_amount >= goal.target_amount
        if update.title is not None:
            goal.title = update.title
        if update.description is not None:
            goal.description = update.description
        if update.target_amount is not None:
            goal.target_amount = update.target_amount
        if update.target_date is not None:
            goal.target_date = update.target_date

        await session.commit()
        await session.refresh(goal)

        progress = await calculate_goal_progress(goal)
        return {"message": "Goal updated", "id": goal.id, **progress}


@router.delete("/{goal_id}")
async def delete_goal(goal_id: int, user_id: str):
    """Delete a goal"""
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(Goal).where(and_(Goal.id == goal_id, Goal.user_id == user_id))
        )
        goal = result.scalar_one_or_none()
        if not goal:
            raise HTTPException(status_code=404, detail="Goal not found")
        await session.delete(goal)
        await session.commit()
        return {"message": "Goal deleted"}


@router.post("/{goal_id}/ai-advice")
async def get_goal_advice(goal_id: int, user_id: str):
    """Get AI advice for achieving a goal"""
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(Goal).where(and_(Goal.id == goal_id, Goal.user_id == user_id))
        )
        goal = result.scalar_one_or_none()
        if not goal:
            raise HTTPException(status_code=404, detail="Goal not found")

    # Get monthly savings
    now = datetime.now(timezone.utc)
    summary = await get_monthly_summary(user_id, now.month, now.year)
    monthly_savings = summary.get("net_balance", 0)

    goal_dict = {
        "title": goal.title,
        "target_amount": goal.target_amount,
        "saved_amount": goal.saved_amount
    }

    advice = await generate_goal_advice(user_id, goal_dict, monthly_savings)
    return {"goal_id": goal_id, "advice": advice}
