#!/usr/bin/env bash
# Starts the API and the UI, each in the background.
# Usage: ./scripts/start.sh
# Works on Linux/macOS and on Windows under Git Bash.

set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [ ! -f "$root/backend/.env" ]; then
    echo -e "\033[31mbackend/.env is missing.\033[0m"
    echo -e "\033[33mCopy backend/.env.example to backend/.env and fill in your Supabase keys first.\033[0m"
    exit 1
fi

# venv layout differs: bin/python on Linux/macOS, Scripts/python.exe on Windows.
if [ -x "$root/backend/.venv/bin/python" ]; then
    python="$root/backend/.venv/bin/python"
elif [ -x "$root/backend/.venv/Scripts/python.exe" ]; then
    python="$root/backend/.venv/Scripts/python.exe"
else
    echo -e "\033[31mbackend/.venv is missing.\033[0m"
    echo -e "\033[33mCreate it first, e.g.: cd backend && python -m venv .venv\033[0m"
    echo -e "\033[33mthen: .venv/bin/pip install -r requirements.txt   (Windows: .venv/Scripts/pip.exe)\033[0m"
    exit 1
fi

api_pid=""
ui_pid=""

cleaned=""
cleanup() {
    # Trapped on both INT and EXIT; only run the body once.
    [ -n "$cleaned" ] && return
    cleaned=1
    echo ""
    echo "Stopping API and UI..."
    [ -n "$api_pid" ] && kill "$api_pid" 2>/dev/null || true
    [ -n "$ui_pid" ] && kill "$ui_pid" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo -e "\033[36mStarting API on http://127.0.0.1:8000 ...\033[0m"
(
    cd "$root/backend"
    "$python" -m uvicorn app.main:app --reload
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
