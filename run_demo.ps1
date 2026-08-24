# PetroPulse AI — Demo Launcher (Windows PowerShell)
# Starts the FastAPI backend and the Vite frontend, waits for health,
# then opens the browser at the landing page.

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "==> PetroPulse AI demo startup" -ForegroundColor Yellow

# 1. Backend
$backend = Join-Path $root "backend"
$venvPython = Join-Path $root ".venv\Scripts\python.exe"
if (-not (Test-Path $venvPython)) {
    Write-Host "    .venv not found — run: python -m venv .venv ; .venv\Scripts\pip install -r backend\requirements.txt"
    exit 1
}

Write-Host "==> Starting backend (uvicorn, port 8000)..."
Start-Process -FilePath $venvPython `
    -ArgumentList "-m", "uvicorn", "app.main:app", "--port", "8000" `
    -WorkingDirectory $backend -WindowStyle Minimized

$healthy = $false
foreach ($i in 1..60) {
    Start-Sleep -Seconds 3
    try {
        $h = Invoke-RestMethod -Uri "http://localhost:8000/health" -TimeoutSec 4
        if ($h.status -eq "ok") { $healthy = $true; break }
    } catch {}
}
if (-not $healthy) {
    Write-Host "    Backend did not become healthy in time (ML warmup can take ~60s on first run)." -ForegroundColor Red
    exit 1
}
Write-Host "    Backend healthy: $($h.service) v$($h.version)" -ForegroundColor Green

# 2. Frontend
$frontend = Join-Path $root "frontend"
Write-Host "==> Starting frontend (Vite dev server, port 5173)..."
Start-Process -FilePath "cmd.exe" `
    -ArgumentList "/c", "npm run dev" `
    -WorkingDirectory $frontend -WindowStyle Minimized

foreach ($i in 1..20) {
    Start-Sleep -Seconds 2
    try {
        Invoke-WebRequest -UseBasicParsing "http://localhost:5173" -TimeoutSec 3 | Out-Null
        break
    } catch {}
}

Write-Host "==> Opening browser..." -ForegroundColor Green
Start-Process "http://localhost:5173"

Write-Host ""
Write-Host "Golden demo path:" -ForegroundColor Yellow
Write-Host "  1. Dashboard          http://localhost:5173/dashboard   (BACKEND LIVE badge)"
Write-Host "  2. Asset Leaderboard  http://localhost:5173/assets/leaderboard"
Write-Host "  3. Asset Detail       MH-07 -> Production Intelligence / Explainable AI tabs"
Write-Host "  4. Priority Board     http://localhost:5173/intelligence/priority"
Write-Host "  5. Simulation Center  http://localhost:5173/scenarios/simulation -> PLAY ([BACKEND WS] tag)"
Write-Host "  6. Provenance         http://localhost:5173/system/provenance"
