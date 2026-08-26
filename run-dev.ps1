# Starts the API and the UI in THIS terminal (no extra windows).
# Usage:  .\run-dev.ps1
# Press Ctrl+C to stop both.

$root = $PSScriptRoot

if (-not (Test-Path "$root\backend\.env")) {
    Write-Host "backend\.env is missing." -ForegroundColor Red
    Write-Host "Copy backend\.env.example to backend\.env and fill in your Supabase keys first." -ForegroundColor Yellow
    exit 1
}

$python = "$root\backend\.venv\Scripts\python.exe"
if (-not (Test-Path $python)) {
    Write-Host "backend\.venv is missing." -ForegroundColor Red
    Write-Host "Create it first: cd backend; python -m venv .venv; .\.venv\Scripts\pip.exe install -r requirements.txt" -ForegroundColor Yellow
    exit 1
}

# Start-Process resolves npm.cmd, not the bare name, when -NoNewWindow is used.
$npm = (Get-Command npm.cmd -ErrorAction SilentlyContinue).Source
if (-not $npm) {
    Write-Host "npm was not found on PATH." -ForegroundColor Red
    exit 1
}

$procs = @()

# Kill the whole tree: uvicorn --reload forks a reloader child, and npm.cmd
# forks node. Stop-Process on the parent alone would orphan them.
function Stop-Tree($proc) {
    if ($null -eq $proc) { return }
    if ($proc.HasExited) { return }
    taskkill /PID $proc.Id /T /F 2>$null | Out-Null
}

try {
    Write-Host "Starting API on http://127.0.0.1:8000 ..." -ForegroundColor Cyan
    $api = Start-Process -FilePath $python `
        -ArgumentList "-m", "uvicorn", "app.main:app", "--reload" `
        -WorkingDirectory "$root\backend" -NoNewWindow -PassThru
    $procs += $api

    Write-Host "Starting UI on http://localhost:5173 ..." -ForegroundColor Cyan
    $ui = Start-Process -FilePath $npm `
        -ArgumentList "run", "dev" `
        -WorkingDirectory "$root\frontend" -NoNewWindow -PassThru
    $procs += $ui

    Write-Host ""
    Write-Host "Both started. Open http://localhost:5173" -ForegroundColor Green
    Write-Host "API docs: http://127.0.0.1:8000/docs" -ForegroundColor Green
    Write-Host "Press Ctrl+C to stop both." -ForegroundColor Green
    Write-Host ""

    # Both children share this console, so their output streams here and Ctrl+C
    # reaches them directly. Exit as soon as EITHER dies so one crashing does
    # not leave the other running silently.
    while (-not $api.HasExited -and -not $ui.HasExited) {
        Start-Sleep -Milliseconds 300
    }
}
finally {
    Write-Host ""
    Write-Host "Stopping API and UI..." -ForegroundColor Yellow
    foreach ($p in $procs) { Stop-Tree $p }
}
