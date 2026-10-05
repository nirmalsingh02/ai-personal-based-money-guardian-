from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class IncomeFrequency(str, Enum):
    monthly = "monthly"
    weekly = "weekly"
    yearly = "yearly"
    custom = "custom"


class UserCreate(BaseModel):
    user_id: str
    name: str
    email: Optional[str] = None


class UserProfile(BaseModel):
    user_id: str
    name: str
    email: Optional[str] = None
    income_amount: Optional[float] = None
    income_frequency: Optional[IncomeFrequency] = IncomeFrequency.monthly
    onboarding_complete: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class IncomeSetup(BaseModel):
    user_id: str
    amount: float
    frequency: IncomeFrequency = IncomeFrequency.monthly
    description: Optional[str] = None


class OnboardingAnswer(BaseModel):
    question: str
    answer: str
    category: str


class OnboardingData(BaseModel):
    user_id: str
    answers: List[OnboardingAnswer]
    estimated_monthly_expenses: Optional[float] = None
    completed_at: Optional[datetime] = None
