from fastapi import APIRouter, HTTPException, Depends
from database.sqlite_client import AsyncSessionLocal, Transaction, Budget
from models.transaction import TransactionCreate, TransactionResponse, BudgetSummary
from services.financial_calc import get_monthly_summary
from services.groq_service import generate_financial_plan
from database.mongo_client import get_db
from sqlalchemy import select, and_, desc
from datetime import datetime, timezone
from typing import List, Optional
import calendar

router = APIRouter(prefix="/api/transactions", tags=["transactions"])


@router.post("/", response_model=dict)
async def create_transaction(transaction: TransactionCreate):
    """Add a new transaction"""
    async with AsyncSessionLocal() as session:
        tx_date = transaction.date or datetime.now(timezone.utc)
        db_tx = Transaction(
            user_id=transaction.user_id,
            amount=transaction.amount,
            transaction_type=transaction.transaction_type.value,
            category=transaction.category.value,
            description=transaction.description,
            date=tx_date,
            is_recurring=transaction.is_recurring,
            recurrence_period=transaction.recurrence_period
        )
        session.add(db_tx)
        await session.commit()
        await session.refresh(db_tx)

        return {
            "id": db_tx.id,
            "message": "Transaction added successfully",
            "amount": db_tx.amount,
            "type": db_tx.transaction_type,
            "category": db_tx.category
        }


@router.get("/{user_id}", response_model=dict)
async def get_transactions(
    user_id: str,
    month: Optional[int] = None,
    year: Optional[int] = None,
    limit: int = 50,
    offset: int = 0
):
    """Get transactions for a user with optional month/year filter"""
    async with AsyncSessionLocal() as session:
        query = select(Transaction).where(Transaction.user_id == user_id)

        if month and year:
            start_date = datetime(year, month, 1, tzinfo=timezone.utc)
            end_day = calendar.monthrange(year, month)[1]
            end_date = datetime(year, month, end_day, 23, 59, 59, tzinfo=timezone.utc)
            query = query.where(
                and_(Transaction.date >= start_date, Transaction.date <= end_date)
            )

        query = query.order_by(desc(Transaction.date)).offset(offset).limit(limit)
        result = await session.execute(query)
        transactions = result.scalars().all()

        return {
            "transactions": [
                {
                    "id": t.id,
                    "amount": t.amount,
                    "transaction_type": t.transaction_type,
                    "category": t.category,
                    "description": t.description,
                    "date": t.date.isoformat(),
                    "is_recurring": t.is_recurring,
                    "recurrence_period": t.recurrence_period
                }
                for t in transactions
            ],
            "count": len(transactions)
        }


@router.delete("/{transaction_id}")
async def delete_transaction(transaction_id: int, user_id: str):
    """Delete a transaction"""
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(Transaction).where(
                and_(Transaction.id == transaction_id, Transaction.user_id == user_id)
            )
        )
        tx = result.scalar_one_or_none()
        if not tx:
            raise HTTPException(status_code=404, detail="Transaction not found")
        await session.delete(tx)
        await session.commit()
        return {"message": "Transaction deleted"}


@router.get("/{user_id}/summary")
async def get_budget_summary(user_id: str, month: Optional[int] = None, year: Optional[int] = None):
    """Get monthly budget summary with P&L"""
    now = datetime.now(timezone.utc)
    target_month = month or now.month
    target_year = year or now.year

    summary = await get_monthly_summary(user_id, target_month, target_year)

    # Get user income from MongoDB for comparison
    db = get_db()
    user = await db.users.find_one({"user_id": user_id})
    if user and user.get("income_amount"):
        income = user["income_amount"]
        freq = user.get("income_frequency", "monthly")
        if freq == "weekly":
            income *= 4.33
        elif freq == "yearly":
            income /= 12
        summary["configured_income"] = round(income, 2)

    return summary


@router.post("/{user_id}/ai-analysis")
async def get_ai_analysis(user_id: str, month: Optional[int] = None, year: Optional[int] = None):
    """Get AI-powered financial analysis for the month"""
    now = datetime.now(timezone.utc)
    summary = await get_monthly_summary(user_id, month or now.month, year or now.year)

    # Get onboarding context
    db = get_db()
    user = await db.users.find_one({"user_id": user_id})
    onboarding = await db.onboarding.find_one({"user_id": user_id})

    financial_data = {
        "monthly_income": user.get("income_amount", 0) if user else 0,
        "total_expenses": summary["total_expense"],
        "food": summary["category_breakdown"].get("food", 0),
        "rent": summary["category_breakdown"].get("rent", 0),
        "transport": summary["category_breakdown"].get("transport", 0),
        "entertainment": summary["category_breakdown"].get("entertainment", 0),
        "other": summary["category_breakdown"].get("other", 0),
        "net_balance": summary["net_balance"],
        "is_profit": summary["is_profit"]
    }

    plan = await generate_financial_plan(user_id, financial_data)
    return {**summary, "ai_plan": plan}
