from fastapi import APIRouter, HTTPException
from database.mongo_client import get_db
from models.user import UserCreate, UserProfile, IncomeSetup
from datetime import datetime, timezone

router = APIRouter(prefix="/api/user", tags=["user"])

@router.post("/create", response_model=dict)
async def create_user(user: UserCreate):
    db = get_db()

    existing = await db.users.find_one({"user_id": user.user_id})

    if existing:
        return {
            "message": "User already exists",
            "user_id": user.user_id
        }

    user_doc = {
        "user_id": user.user_id,
        "name": user.name,
        "email": user.email,
        "income_amount": None,
        "income_frequency": "monthly",
        "onboarding_complete": False,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }

    await db.users.insert_one(user_doc)

    return {
        "message": "User created successfully",
        "user_id": user.user_id
    }

@router.get("/{user_id}", response_model=dict)
async def get_user(user_id: str):
    """Get user profile"""
    db = get_db()
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.post("/income", response_model=dict)
async def set_income(income: IncomeSetup):
    """Set user income"""
    db = get_db()
    result = await db.users.update_one(
        {"user_id": income.user_id},
        {"$set": {
            "income_amount": income.amount,
            "income_frequency": income.frequency,
            "updated_at": datetime.now(timezone.utc)
        }},
        upsert=True
    )

    # Normalize to monthly
    monthly_income = income.amount
    if income.frequency == "weekly":
        monthly_income = income.amount * 4.33
    elif income.frequency == "yearly":
        monthly_income = income.amount / 12

    return {
        "message": "Income set successfully",
        "amount": income.amount,
        "frequency": income.frequency,
        "monthly_equivalent": round(monthly_income, 2)
    }


@router.get("/{user_id}/status", response_model=dict)
async def get_onboarding_status(user_id: str):
    """Check onboarding status"""
    db = get_db()
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user:
        return {"onboarding_complete": False, "has_income": False}

    onboarding = await db.onboarding.find_one({"user_id": user_id})
    return {
        "onboarding_complete": user.get("onboarding_complete", False),
        "has_income": user.get("income_amount") is not None,
        "income_amount": user.get("income_amount"),
        "income_frequency": user.get("income_frequency", "monthly"),
        "has_onboarding_data": onboarding is not None
    }
