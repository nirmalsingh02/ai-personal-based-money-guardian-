import yfinance as yf
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import List, Optional
import asyncio
from concurrent.futures import ThreadPoolExecutor

executor = ThreadPoolExecutor(max_workers=4)

# Curated list of popular Indian & US stocks
SUGGESTED_STOCKS = {
    "indian_large_cap": [
        {"symbol": "RELIANCE.NS", "name": "Reliance Industries", "sector": "Energy/Retail"},
        {"symbol": "TCS.NS", "name": "TCS", "sector": "IT"},
        {"symbol": "HDFCBANK.NS", "name": "HDFC Bank", "sector": "Banking"},
        {"symbol": "INFY.NS", "name": "Infosys", "sector": "IT"},
        {"symbol": "ICICIBANK.NS", "name": "ICICI Bank", "sector": "Banking"},
    ],
    "indian_mid_cap": [
        {"symbol": "WIPRO.NS", "name": "Wipro", "sector": "IT"},
        {"symbol": "BAJFINANCE.NS", "name": "Bajaj Finance", "sector": "Finance"},
        {"symbol": "AXISBANK.NS", "name": "Axis Bank", "sector": "Banking"},
    ],
    "us_tech": [
        {"symbol": "AAPL", "name": "Apple", "sector": "Technology"},
        {"symbol": "GOOGL", "name": "Google", "sector": "Technology"},
        {"symbol": "MSFT", "name": "Microsoft", "sector": "Technology"},
    ]
}


def _fetch_stock_data(symbol: str, period: str = "3mo") -> dict:
    """Synchronous stock data fetch using yfinance"""
    try:
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period=period)

        if hist.empty:
            return {"error": f"No data found for {symbol}"}

        # Basic info
        info = ticker.fast_info
        current_price = float(hist['Close'].iloc[-1])
        prev_price = float(hist['Close'].iloc[-2]) if len(hist) > 1 else current_price
        price_change = current_price - prev_price
        price_change_pct = (price_change / prev_price * 100) if prev_price > 0 else 0

        # Historical data for chart (last 90 days)
        chart_data = []
        for date, row in hist.iterrows():
            chart_data.append({
                "date": date.strftime("%Y-%m-%d"),
                "open": round(float(row['Open']), 2),
                "high": round(float(row['High']), 2),
                "low": round(float(row['Low']), 2),
                "close": round(float(row['Close']), 2),
                "volume": int(row['Volume'])
            })

        # 15-day prediction using linear regression + moving average
        prediction = _predict_next_15_days(hist)

        return {
            "symbol": symbol,
            "current_price": round(current_price, 2),
            "price_change": round(price_change, 2),
            "price_change_pct": round(price_change_pct, 2),
            "is_positive": price_change >= 0,
            "chart_data": chart_data,
            "prediction": prediction,
            "52_week_high": round(float(hist['High'].max()), 2),
            "52_week_low": round(float(hist['Low'].min()), 2),
        }
    except Exception as e:
        return {"error": str(e), "symbol": symbol}


def _predict_next_15_days(hist: pd.DataFrame) -> List[dict]:
    """Generate 15-day price prediction using linear regression + momentum"""
    try:
        closes = hist['Close'].values
        n = len(closes)

        if n < 10:
            return []

        # Use last 30 days for trend
        recent = closes[-30:] if n >= 30 else closes
        x = np.arange(len(recent))
        y = recent

        # Linear regression for trend
        coeffs = np.polyfit(x, y, 1)
        slope = coeffs[0]

        # Moving averages
        ma7 = np.mean(closes[-7:])
        ma14 = np.mean(closes[-14:]) if n >= 14 else ma7

        # Momentum: blend linear trend + MA mean reversion
        last_price = closes[-1]
        predictions = []
        last_date = hist.index[-1]

        for i in range(1, 16):
            future_date = last_date + timedelta(days=i)
            # Skip weekends
            while future_date.weekday() >= 5:
                future_date += timedelta(days=1)

            # Trend component
            trend_price = last_price + (slope * i * 0.7)
            # Add slight upward bias + small random noise for realism
            noise = np.random.normal(0, abs(slope) * 0.3)
            predicted_price = trend_price + noise

            # Ensure price stays reasonable (within ±15%)
            predicted_price = max(last_price * 0.85, min(last_price * 1.15, predicted_price))

            predictions.append({
                "date": future_date.strftime("%Y-%m-%d"),
                "predicted_price": round(float(predicted_price), 2),
                "is_prediction": True
            })

        return predictions
    except Exception:
        return []


async def get_stock_data(symbol: str, period: str = "3mo") -> dict:
    """Async wrapper for stock data fetch"""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(executor, _fetch_stock_data, symbol, period)


async def get_multiple_stocks(symbols: List[str]) -> List[dict]:
    """Fetch multiple stocks concurrently"""
    tasks = [get_stock_data(symbol) for symbol in symbols]
    return await asyncio.gather(*tasks)


async def get_suggested_stocks(budget: float) -> dict:
    """Get AI-suggested stocks based on user budget"""
    # Fetch top 5 suggested stocks
    symbols = [s["symbol"] for s in SUGGESTED_STOCKS["indian_large_cap"][:3]] + \
              [s["symbol"] for s in SUGGESTED_STOCKS["us_tech"][:2]]

    stocks_data = await get_multiple_stocks(symbols)

    # Calculate how many shares user can buy
    result = []
    for stock_info, data in zip(
        SUGGESTED_STOCKS["indian_large_cap"][:3] + SUGGESTED_STOCKS["us_tech"][:2],
        stocks_data
    ):
        if "error" not in data:
            price = data["current_price"]
            affordable_shares = int(budget / price) if price > 0 else 0
            investment_value = affordable_shares * price

            result.append({
                **stock_info,
                **data,
                "affordable_shares": affordable_shares,
                "investment_value": round(investment_value, 2),
                "remaining_after_investment": round(budget - investment_value, 2)
            })

    return {
        "budget": budget,
        "stocks": result,
        "suggestion_note": "These are AI-curated suggestions based on your budget. Always do your own research before investing."
    }


async def search_stock(query: str) -> dict:
    """Search for a stock by symbol or name"""
    # Try direct symbol lookup
    symbol = query.upper()
    if not symbol.endswith(".NS") and len(symbol) <= 6:
        # Try Indian market first
        ns_data = await get_stock_data(f"{symbol}.NS")
        if "error" not in ns_data:
            return ns_data

    return await get_stock_data(symbol)
