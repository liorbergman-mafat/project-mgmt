#!/usr/bin/env bash
# Starts the API and the UI, each in the background.
# Usage: ./scripts/start.sh

set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [ ! -f "$root/backend/.env" ]; then
    echo -e "\033[31mbackend/.env is missing.\033[0m"
    echo -e "\033[33mCopy backend/.env.example to backend/.env and fill in your Supabase keys first.\033[0m"
    exit 1
fi

if [ ! -x "$root/backend/.venv/bin/python" ]; then
    echo -e "\033[31mbackend/.venv is missing.\033[0m"
    echo -e "\033[33mCreate it first, e.g.: cd backend && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt\033[0m"
    exit 1
fi

cleanup() {
    echo ""
    echo "Stopping API and UI..."
    kill "$api_pid" "$ui_pid" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo -e "\033[36mStarting API on http://127.0.0.1:8000 ...\033[0m"
(
    cd "$root/backend"
    ./.venv/bin/python -m uvicorn app.main:app --reload
) &
api_pid=$!

echo -e "\033[36mStarting UI on http://localhost:5173 ...\033[0m"
(
    cd "$root/frontend"
    npm run dev
) &
ui_pid=$!

echo ""
echo -e "\033[32mBoth started. Open http://localhost:5173\033[0m"
echo -e "\033[32mAPI docs: http://127.0.0.1:8000/docs\033[0m"
echo "Press Ctrl+C to stop both."

wait "$api_pid" "$ui_pid"
