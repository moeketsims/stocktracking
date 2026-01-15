# Local Development Setup Script (Windows PowerShell)
# This script starts Supabase and configures the backend with correct credentials

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Potato Stock Tracking - Local Setup" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check prerequisites
try {
    docker --version | Out-Null
} catch {
    Write-Host "Docker is required but not installed. Aborting." -ForegroundColor Red
    exit 1
}

# Navigate to project root
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
Set-Location $ProjectRoot

Write-Host "[1/5] Starting Supabase..." -ForegroundColor Yellow
Set-Location "infra/supabase"
npx supabase start

Write-Host ""
Write-Host "[2/5] Extracting Supabase credentials..." -ForegroundColor Yellow

# Get credentials from supabase status
$statusJson = npx supabase status --output json 2>$null
$status = $statusJson | ConvertFrom-Json

$SupabaseUrl = $status.'API URL'
$AnonKey = $status.'anon key'
$ServiceKey = $status.'service_role key'

# Fallback to default values if needed
if (-not $SupabaseUrl) {
    $SupabaseUrl = "http://127.0.0.1:54321"
}

Set-Location $ProjectRoot

Write-Host ""
Write-Host "[3/5] Updating backend environment..." -ForegroundColor Yellow

$backendEnv = @"
PORT=3001
SUPABASE_URL=$SupabaseUrl
SUPABASE_ANON_KEY=$AnonKey
SUPABASE_SERVICE_KEY=$ServiceKey
"@

$backendEnv | Out-File -FilePath "web-platform/backend-python/.env" -Encoding utf8 -NoNewline
Write-Host "Backend .env updated with Supabase credentials" -ForegroundColor Green

Write-Host ""
Write-Host "[4/5] Updating frontend environment..." -ForegroundColor Yellow

$frontendEnv = @"
VITE_API_URL=http://localhost:3001
"@

$frontendEnv | Out-File -FilePath "web-platform/frontend/.env" -Encoding utf8 -NoNewline
Write-Host "Frontend .env configured" -ForegroundColor Green

Write-Host ""
Write-Host "[5/5] Running database migrations and seed..." -ForegroundColor Yellow
Set-Location "infra/supabase"
npx supabase db reset

Set-Location $ProjectRoot

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Supabase Studio: http://localhost:54323" -ForegroundColor White
Write-Host "API URL: $SupabaseUrl" -ForegroundColor White
Write-Host ""
Write-Host "To start the web platform:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Terminal 1 (Backend):" -ForegroundColor White
Write-Host "    cd web-platform/backend-python" -ForegroundColor Gray
Write-Host "    pip install -r requirements.txt  # First time only" -ForegroundColor Gray
Write-Host "    python main.py" -ForegroundColor Gray
Write-Host ""
Write-Host "  Terminal 2 (Frontend):" -ForegroundColor White
Write-Host "    cd web-platform/frontend" -ForegroundColor Gray
Write-Host "    npm install  # First time only" -ForegroundColor Gray
Write-Host "    npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "Or run both together:" -ForegroundColor White
Write-Host "    npm run web:start" -ForegroundColor Gray
Write-Host ""
Write-Host "Login: admin@test.com / Test123!" -ForegroundColor Green
Write-Host ""
