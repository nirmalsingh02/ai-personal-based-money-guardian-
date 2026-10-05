from groq import AsyncGroq
from database.mongo_client import get_db
from datetime import datetime, timezone
from typing import Optional, List
import os
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "").strip("\"'")
MODEL = os.getenv("GROQ_MODEL", "qwen/qwen3.8-27b")

client = AsyncGroq(api_key=GROQ_API_KEY)

SYSTEM_PROMPT = """You are FinanceAI — an expert personal financial guardian and advisor.
You help users manage their money, plan budgets, suggest investments, and achieve financial goals.

You speak in a friendly, clear, and encouraging tone. Keep responses concise but insightful.
Always use Indian Rupee (₹) format. Format numbers in Indian style (lakhs, thousands).
When suggesting investments, always mention risk levels and disclaimers.
Be supportive and motivating when users face financial challenges.
"""

ONBOARDING_QUESTIONS = [
    {"question": "How much do you spend on breakfast per day? (Enter 0 if you skip)", "category": "food", "key": "breakfast_daily"},
    {"question": "How much do you spend on lunch per day?", "category": "food", "key": "lunch_daily"},
    {"question": "How much do you spend on dinner per day?", "category": "food", "key": "dinner_daily"},
    {"question": "What is your monthly rent or home loan EMI? (Enter 0 if none)", "category": "rent", "key": "rent_monthly"},
    {"question": "Do you travel to work? If yes, what is your monthly transport cost? (Enter 0 if no)", "category": "transport", "key": "transport_monthly"},
    {"question": "How much do you spend on groceries per month?", "category": "food", "key": "groceries_monthly"},
    {"question": "What is your average monthly mobile/internet bill?", "category": "utilities", "key": "utilities_monthly"},
    {"question": "Do you have any EMIs or loan payments per month? If yes, how much?", "category": "loan", "key": "loan_monthly"},
    {"question": "How much do you spend on entertainment/subscriptions monthly? (movies, OTT, etc.)", "category": "entertainment", "key": "entertainment_monthly"},
    {"question": "What is your average monthly healthcare/medical expense?", "category": "health", "key": "health_monthly"},
]


async def get_onboarding_questions() -> List[dict]:
    """Return the list of onboarding questions"""
    return ONBOARDING_QUESTIONS


async def store_conversation(user_id: str, role: str, content: str, context_type: str = "general"):
    """Store a conversation message in MongoDB"""
    db = get_db()
    if db is None:
        return
    await db.conversations.insert_one({
        "user_id": user_id,
        "role": role,
        "content": content,
        "context_type": context_type,
        "timestamp": datetime.now(timezone.utc)
    })


async def get_conversation_history(user_id: str, limit: int = 10, context_type: str = "general") -> List[dict]:
    """Get recent conversation history for context"""
    db = get_db()
    if db is None:
        return []
    cursor = db.conversations.find(
        {"user_id": user_id, "context_type": context_type},
        sort=[("timestamp", -1)],
        limit=limit
    )
    messages = await cursor.to_list(length=limit)
    messages.reverse()
    return [{"role": m["role"], "content": m["content"]} for m in messages]


async def chat_with_ai(user_id: str, user_message: str, context_type: str = "general",
                       financial_context: Optional[dict] = None) -> str:
    """Send a message to Groq and get a response"""
    # Get conversation history
    history = await get_conversation_history(user_id, limit=8, context_type=context_type)

    # Build system message with financial context
    system_content = SYSTEM_PROMPT
    if financial_context:
        system_content += f"\n\nCurrent Financial Context:\n"
        for key, value in financial_context.items():
            system_content += f"- {key}: {value}\n"

    messages = [{"role": "system", "content": system_content}]
    messages.extend(history)
    messages.append({"role": "user", "content": user_message})

    try:
        response = await client.chat.completions.create(
            model=MODEL,
            messages=messages,
            max_tokens=1024,
            temperature=0.7,
        )
        ai_response = response.choices[0].message.content

        # Store conversation
        await store_conversation(user_id, "user", user_message, context_type)
        await store_conversation(user_id, "assistant", ai_response, context_type)

        return ai_response
    except Exception as e:
        error_msg = f"AI service temporarily unavailable. Please check your GROQ_API_KEY. Error: {str(e)}"
        return error_msg


async def generate_financial_plan(user_id: str, financial_data: dict) -> dict:
    """Generate a comprehensive financial plan using AI"""
    income = financial_data.get("monthly_income", 0)
    expenses = financial_data.get("total_expenses", 0)
    savings = income - expenses

    prompt = f"""Based on the following financial data, provide a comprehensive plan:
    
Monthly Income: ₹{income:,.0f}
Total Monthly Expenses: ₹{expenses:,.0f}
Net Savings: ₹{savings:,.0f}
Expense Breakdown:
- Food: ₹{financial_data.get('food', 0):,.0f}
- Rent: ₹{financial_data.get('rent', 0):,.0f}
- Transport: ₹{financial_data.get('transport', 0):,.0f}
- Entertainment: ₹{financial_data.get('entertainment', 0):,.0f}
- Other: ₹{financial_data.get('other', 0):,.0f}

Please provide:
1. Financial health assessment (Profit/Loss status)
2. Top 3 areas to optimize spending
3. Investment recommendations for ₹{max(savings, 0):,.0f}
4. Emergency fund target
5. One motivational tip

Keep response structured and actionable."""

    response = await chat_with_ai(user_id, prompt, context_type="planning", financial_context=financial_data)
    return {"plan": response, "generated_at": datetime.now(timezone.utc).isoformat()}


async def generate_investment_advice(user_id: str, available_amount: float, risk_profile: str = "moderate") -> str:
    """Generate investment advice for available amount"""
    prompt = f"""I have ₹{available_amount:,.0f} available to invest this month.
Risk profile: {risk_profile}

Please suggest:
1. How to split this amount (e.g., 40% stocks, 30% mutual funds, 20% SIP, 10% savings)
2. Specific Indian stock categories or sectors to consider
3. 2-3 specific mutual fund types suitable for this amount
4. Expected returns (realistic range)
5. Time horizon recommendation

Keep it practical and India-specific. Mention that these are suggestions, not financial advice."""

    return await chat_with_ai(user_id, prompt, context_type="investment")


async def generate_goal_advice(user_id: str, goal: dict, monthly_savings: float) -> str:
    """Generate advice for achieving a financial goal"""
    target = goal.get("target_amount", 0)
    saved = goal.get("saved_amount", 0)
    remaining = target - saved
    days_needed = (remaining / monthly_savings * 30) if monthly_savings > 0 else float('inf')

    prompt = f"""Financial Goal Analysis:
Goal: {goal.get('title', 'Product Purchase')}
Target Amount: ₹{target:,.0f}
Amount Saved: ₹{saved:,.0f}
Remaining: ₹{remaining:,.0f}
Current Monthly Savings: ₹{monthly_savings:,.0f}
Estimated Days to Goal: {days_needed:.0f} days

Please provide:
1. How many months/days to achieve this goal at current savings rate
2. Strategies to reach the goal faster
3. Whether to save more or earn more (specific suggestions)
4. Alternative ways to fund this purchase
5. Encouragement and a concrete action plan

Be specific and motivating!"""

    return await chat_with_ai(user_id, prompt, context_type="goals")
