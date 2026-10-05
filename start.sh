#!/bin/bash
# AI Financial Guardian - Startup Script

echo "=========================================="
echo "🛡️  AI FINANCIAL GUARDIAN"
echo "=========================================="

# Export node in path if needed
export PATH="/Users/nirmal/.node/bin:/usr/local/bin:$PATH"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

echo "1. Starting FastAPI backend on http://127.0.0.1:8000..."
cd "$BACKEND_DIR"
python3 -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload &
BACKEND_PID=$!

echo "2. Starting Vite frontend on http://localhost:5173..."
cd "$FRONTEND_DIR"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "🚀 AI Financial Guardian is up and running!"
echo "   - Frontend UI: http://localhost:5173"
echo "   - Backend API: http://127.0.0.1:8000"
echo "   - Swagger Docs: http://127.0.0.1:8000/docs"
echo ""
echo "Press Ctrl+C to terminate all services."

cleanup() {
    echo ""
    echo "Stopping servers..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM
wait
