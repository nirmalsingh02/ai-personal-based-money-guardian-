# 🛡️ AI Financial Guardian

An intelligent, AI-powered personal finance guardian built with **Python (FastAPI + Groq LLM)** and **React (Vite + Framer Motion + Recharts)**. It tracks salary and income, conducts an intelligent one-time onboarding interview for daily needs, manages budgets in real-time (profit vs loss), recommends stock investments with predictive charts, tracks future goals, and provides an interactive AI Financial Guardian chat assistant.

---

## ✨ Key Features

1. **Intelligent Onboarding Interview (Memory)**:
   - Sets income with customizable frequency (Monthly, Yearly, Weekly).
   - One-time interactive Q&A for daily living expenses (breakfast, lunch, dinner, transportation/office commute, rent, utilities, shopping).
   - Dynamic memory persistence in MongoDB (with automatic resilient file fallback if MongoDB is not running).
   - AI computes daily and monthly expense estimates.

2. **Daily Needs & P&L Tracker**:
   - Real-time expense & income tracker with categorical breakdown (Food, Transport, Rent, Entertainment, Health, Shopping, Savings).
   - Instant Net Profit / Net Loss calculation card.
   - Groq AI-powered budget analysis and spending optimization recommendations.

3. **Smart Investment Module & Stock Predictions**:
   - Real-time stock quotes via Yahoo Finance (`yfinance`).
   - Interactive historical price chart and **15-day AI/statistical predictive forecast** with confidence bands.
   - Asset allocation calculator (Equities, Index ETFs, Debt, Emergency Fund) based on remaining surplus.
   - Groq AI custom investment advice generator.

4. **Future Goals Planner**:
   - Target savings tracking with progress bars, countdown calculator, and target milestones.
   - AI-driven goal attainment strategy (e.g. monthly savings required, risk profile).

5. **24/7 AI Guardian Assistant**:
   - Integrated floating chat widget and dedicated AI assistant view.
   - Context-aware financial advice powered by Groq LLM (e.g. `llama-3.3-70b-versatile`).

---

## 🛠️ Tech Stack

- **Backend**:
  - Python 3.12+
  - FastAPI (REST API & OpenAPI / Swagger)
  - Groq Cloud API (Llama 3.3 70B Versatile LLM)
  - SQLite + SQLAlchemy 2.0 (Transactions, Budgets, Goals)
  - MongoDB + Motor (User profile, Onboarding memory, Chat history)
  - Yahoo Finance (`yfinance`) + Scikit-Learn / NumPy
- **Frontend**:
  - React 18 + Vite
  - Framer Motion (Glassmorphism UI animations)
  - Recharts (Interactive stock charts & spending distribution)
  - Zustand (State management with local persistence)
  - Lucide React & React Hot Toast

---

## 🚀 Quick Start

### 1. Prerequisites
- Python 3.10+
- Node.js 18+

### 2. Configure Environment
Set your Groq API key in `backend/.env`:
```bash
GROQ_API_KEY=your_groq_api_key_here
MONGODB_URL=mongodb://localhost:27017
SQLITE_DB_PATH=./financial_data.db
```

### 3. One-Click Launch
Run the startup script from the project root:
```bash
./start.sh
```

Or start backend and frontend individually:
- **Backend**:
  ```bash
  cd backend
  python3 -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
  ```
- **Frontend**:
  ```bash
  cd frontend
  npm run dev
  ```

Access the application:
- **Frontend UI**: [http://localhost:5173](http://localhost:5173)
- **FastAPI Documentation**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
