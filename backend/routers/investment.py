from fastapi import APIRouter, HTTPException
from services.stock_service import get_stock_data, get_multiple_stocks, get_suggested_stocks, search_stock
from services.groq_service import generate_investment_advice
from services.financial_calc import get_investment_allocation, get_monthly_summary
from database.mongo_client import get_db
from datetime import datetime, timezone

router = APIRouter(prefix="/api/investment", tags=["investment"])


@router.get("/suggested/{user_id}")
async def get_suggested_investments(user_id: str):
    """Get AI-suggested investments based on user's available budget"""
    db = get_db()
    user = await db.users.find_one({"user_id": user_id})

    monthly_income = 0
    if user and user.get("income_amount"):
        monthly_income = user["income_amount"]
        freq = user.get("income_frequency", "monthly")
        if freq == "weekly":
            monthly_income *= 4.33
        elif freq == "yearly":
            monthly_income /= 12

    now = datetime.now(timezone.utc)
    summary = await get_monthly_summary(user_id, now.month, now.year)
    available = max(0, monthly_income - summary["total_expense"])

    stocks = await get_suggested_stocks(available)
    allocation = await get_investment_allocation(monthly_income, summary["total_expense"])

    return {
        "available_to_invest": round(available, 2),
        "allocation_plan": allocation,
        "suggested_stocks": stocks
    }


@router.get("/stock/{symbol}")
async def get_stock(symbol: str, period: str = "3mo"):
    """Get stock data with prediction"""
    data = await get_stock_data(symbol, period)
    if "error" in data:
        raise HTTPException(status_code=404, detail=data["error"])
    return data


@router.get("/stocks/multiple")
async def get_multiple(symbols: str):
    """Get multiple stocks — pass comma-separated symbols"""
    symbol_list = [s.strip() for s in symbols.split(",")]
    if len(symbol_list) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 symbols allowed")
    data = await get_multiple_stocks(symbol_list)
    return {"stocks": data}


@router.get("/search/{query}")
async def search(query: str):
    """Search for a stock"""
    data = await search_stock(query)
    return data


@router.post("/ai-advice")
async def get_investment_ai_advice(payload: dict):
    """Get AI investment advice"""
    user_id = payload.get("user_id")
    available_amount = payload.get("available_amount", 0)
    risk_profile = payload.get("risk_profile", "moderate")

    advice = await generate_investment_advice(user_id, available_amount, risk_profile)
    return {"advice": advice, "generated_at": datetime.now(timezone.utc).isoformat()}


@router.get("/popular-stocks")
async def get_popular_stocks():
    """Get popular stocks for display"""
    symbols = ["RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "AAPL", "GOOGL"]
    data = await get_multiple_stocks(symbols)
    return {"stocks": [d for d in data if "error" not in d]}
