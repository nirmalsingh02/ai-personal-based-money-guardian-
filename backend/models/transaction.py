from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class TransactionTypeEnum(str, Enum):
    income = "income"
    expense = "expense"
    investment = "investment"
    savings = "savings"


class TransactionCategoryEnum(str, Enum):
    salary = "salary"
    food = "food"
    transport = "transport"
    rent = "rent"
    entertainment = "entertainment"
    health = "health"
    shopping = "shopping"
    investment = "investment"
    savings = "savings"
    other = "other"


class TransactionCreate(BaseModel):
    user_id: str
    amount: float
    transaction_type: TransactionTypeEnum
    category: TransactionCategoryEnum = TransactionCategoryEnum.other
    description: Optional[str] = None
    date: Optional[datetime] = None
    is_recurring: bool = False
    recurrence_period: Optional[str] = None  # monthly, weekly, yearly


class TransactionResponse(BaseModel):
    id: int
    user_id: str
    amount: float
    transaction_type: str
    category: str
    description: Optional[str]
    date: datetime
    is_recurring: bool
    recurrence_period: Optional[str]

    class Config:
        from_attributes = True


class BudgetSummary(BaseModel):
    user_id: str
    month: int
    year: int
    total_income: float
    total_expense: float
    total_investment: float
    total_savings: float
    net_balance: float
    profit_loss: float
    profit_loss_percentage: float


class GoalCreate(BaseModel):
    user_id: str
    title: str
    description: Optional[str] = None
    target_amount: float
    saved_amount: float = 0.0
    target_date: Optional[datetime] = None


class GoalResponse(BaseModel):
    id: int
    user_id: str
    title: str
    description: Optional[str]
    target_amount: float
    saved_amount: float
    target_date: Optional[datetime]
    is_completed: bool
    progress_percentage: float
    days_remaining: Optional[int]
    daily_savings_needed: Optional[float]
    created_at: datetime

    class Config:
        from_attributes = True


class GoalUpdate(BaseModel):
    saved_amount: Optional[float] = None
    title: Optional[str] = None
    description: Optional[str] = None
    target_amount: Optional[float] = None
    target_date: Optional[datetime] = None
