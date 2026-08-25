# Starts the API and the UI in two separate PowerShell windows.
# Usage:  .\scripts\run-dev.ps1

$root = Split-Path -Parent $PSScriptRoot

if (-not (Test-Path "$root\backend\.env")) {
    Write-Host "backend\.env is missing." -ForegroundColor Red
    Write-Host "Copy backend\.env.example to backend\.env and fill in your Supabase keys first." -ForegroundColor Yellow
    exit 1
}

Write-Host "Starting API on http://127.0.0.1:8000 ..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList @(
    "-NoExit", "-Command",
    "Set-Location '$root\backend'; .\.venv\Scripts\python.exe -m uvicorn app.main:app --reload"
)

Write-Host "Starting UI on http://localhost:5173 ..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList @(
    "-NoExit", "-Command",
    "Set-Location '$root\frontend'; npm run dev"
)

Write-Host ""
Write-Host "Both started. Open http://localhost:5173" -ForegroundColor Green
Write-Host "API docs: http://127.0.0.1:8000/docs" -ForegroundColor Green
