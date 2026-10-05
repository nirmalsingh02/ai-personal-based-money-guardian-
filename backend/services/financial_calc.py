from datetime import datetime, timezone
from typing import Optional, List
from database.sqlite_client import Transaction, Budget, Goal, AsyncSessionLocal
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
import calendar


async def get_monthly_summary(user_id: str, month: int, year: int) -> dict:
    """Calculate monthly income, expenses, and net balance"""
    async with AsyncSessionLocal() as session:
        # Get all transactions for this month
        start_date = datetime(year, month, 1, tzinfo=timezone.utc)
        end_day = calendar.monthrange(year, month)[1]
        end_date = datetime(year, month, end_day, 23, 59, 59, tzinfo=timezone.utc)

        result = await session.execute(
            select(Transaction).where(
                and_(
                    Transaction.user_id == user_id,
                    Transaction.date >= start_date,
                    Transaction.date <= end_date
                )
            )
        )
        transactions = result.scalars().all()

        total_income = sum(t.amount for t in transactions if t.transaction_type == "income")
        total_expense = sum(t.amount for t in transactions if t.transaction_type == "expense")
        total_investment = sum(t.amount for t in transactions if t.transaction_type == "investment")
        total_savings = sum(t.amount for t in transactions if t.transaction_type == "savings")

        net_balance = total_income - total_expense - total_investment - total_savings
        profit_loss = net_balance
        profit_loss_pct = (profit_loss / total_income * 100) if total_income > 0 else 0

        # Category breakdown
        category_breakdown = {}
        for t in transactions:
            if t.transaction_type == "expense":
                cat = t.category
                category_breakdown[cat] = category_breakdown.get(cat, 0) + t.amount

        return {
            "user_id": user_id,
            "month": month,
            "year": year,
            "total_income": round(total_income, 2),
            "total_expense": round(total_expense, 2),
            "total_investment": round(total_investment, 2),
            "total_savings": round(total_savings, 2),
            "net_balance": round(net_balance, 2),
            "profit_loss": round(profit_loss, 2),
            "profit_loss_percentage": round(profit_loss_pct, 2),
            "is_profit": profit_loss >= 0,
            "category_breakdown": {k: round(v, 2) for k, v in category_breakdown.items()},
            "transactions_count": len(transactions)
        }


async def calculate_goal_progress(goal: Goal) -> dict:
    """Calculate goal progress and time estimates"""
    target = goal.target_amount
    saved = goal.saved_amount
    progress_pct = (saved / target * 100) if target > 0 else 0
    remaining = max(0, target - saved)

    days_remaining = None
    daily_savings_needed = None

    if goal.target_date:
        now = datetime.now(timezone.utc)
        target_date = goal.target_date
        if target_date.tzinfo is None:
            target_date = target_date.replace(tzinfo=timezone.utc)
        days_remaining = max(0, (target_date - now).days)
        daily_savings_needed = (remaining / days_remaining) if days_remaining > 0 else remaining

    return {
        "progress_percentage": round(min(100, progress_pct), 2),
        "remaining_amount": round(remaining, 2),
        "days_remaining": days_remaining,
        "daily_savings_needed": round(daily_savings_needed, 2) if daily_savings_needed else None,
        "is_completed": saved >= target
    }


async def get_investment_allocation(monthly_income: float, total_expenses: float) -> dict:
    """Calculate recommended investment allocation"""
    available = max(0, monthly_income - total_expenses)

    # Standard 50-30-20 rule adapted
    if available <= 0:
        return {
            "available": 0,
            "status": "deficit",
            "message": "You are currently in a deficit. Focus on reducing expenses first.",
            "allocations": []
        }

    # Allocation percentages
    emergency_fund = min(available * 0.3, 50000)  # Max 50k for emergency
    sip_mutual_funds = available * 0.35
    stocks = available * 0.25
    gold_savings = available * 0.10

    return {
        "available": round(available, 2),
        "status": "surplus",
        "allocations": [
            {"type": "Emergency Fund / FD", "amount": round(emergency_fund, 2), "percentage": 30, "risk": "Low"},
            {"type": "SIP / Mutual Funds", "amount": round(sip_mutual_funds, 2), "percentage": 35, "risk": "Medium"},
            {"type": "Stocks / ETFs", "amount": round(stocks, 2), "percentage": 25, "risk": "Medium-High"},
            {"type": "Gold / Digital Gold", "amount": round(gold_savings, 2), "percentage": 10, "risk": "Low-Medium"},
        ]
    }
