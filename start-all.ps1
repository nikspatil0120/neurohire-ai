# NeuroHire AI - Complete System Startup Script
# Run this with: .\start-all.ps1

Write-Host "🚀 Starting NeuroHire AI System..." -ForegroundColor Cyan
Write-Host ""

# Check if MongoDB is running
Write-Host "📦 Checking MongoDB..." -ForegroundColor Yellow
$mongoService = Get-Service -Name MongoDB -ErrorAction SilentlyContinue

if ($mongoService) {
    if ($mongoService.Status -eq "Running") {
        Write-Host "✅ MongoDB is already running" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Starting MongoDB service..." -ForegroundColor Yellow
        Start-Service MongoDB
        Write-Host "✅ MongoDB started" -ForegroundColor Green
    }
} else {
    Write-Host "⚠️  MongoDB service not found. Please start MongoDB manually:" -ForegroundColor Red
    Write-Host "   Run: mongod" -ForegroundColor Yellow
    Write-Host ""
}

Write-Host ""
Write-Host "📋 Starting Backend and Frontend..." -ForegroundColor Cyan
Write-Host ""
Write-Host "Instructions:" -ForegroundColor Yellow
Write-Host "1. Backend will start in a new window (keep it open)" -ForegroundColor White
Write-Host "2. Frontend will start in another window (keep it open)" -ForegroundColor White
Write-Host "3. Browser will open automatically" -ForegroundColor White
Write-Host ""

# Start Backend in new window
Write-Host "🔧 Starting Backend Server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; Write-Host '🔧 Starting FastAPI Backend...' -ForegroundColor Cyan; python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

# Wait a bit for backend to start
Write-Host "⏳ Waiting for backend to initialize (5 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Start Frontend in new window
Write-Host "⚛️  Starting Frontend Dev Server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host '⚛️  Starting Vite Frontend...' -ForegroundColor Cyan; npm run dev"

# Wait for frontend to start
Write-Host "⏳ Waiting for frontend to initialize (5 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Open browser
Write-Host "🌐 Opening browser..." -ForegroundColor Yellow
Start-Process "http://localhost:5173"

Write-Host ""
Write-Host "✅ System Started!" -ForegroundColor Green
Write-Host ""
Write-Host "📍 URLs:" -ForegroundColor Cyan
Write-Host "   Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "   Backend:  http://localhost:8000" -ForegroundColor White
Write-Host "   API Docs: http://localhost:8000/docs" -ForegroundColor White
Write-Host ""
Write-Host "🔐 Admin Login:" -ForegroundColor Cyan
Write-Host "   Email:    admin@xyz.com" -ForegroundColor White
Write-Host "   Password: admin@123" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  Keep the Backend and Frontend windows open!" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press any key to exit this window..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
