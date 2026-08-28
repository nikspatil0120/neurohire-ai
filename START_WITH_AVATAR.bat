@echo off
echo ============================================
echo   NeuroHire AI - Avatar Integration
echo ============================================
echo.

echo Starting Backend with Avatar Support...
start "NeuroHire Backend" cmd /k "cd backend && echo Starting FastAPI Backend with Avatar... && python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

echo Waiting for backend to start...
timeout /t 5 /nobreak >nul

echo Starting Frontend...
start "NeuroHire Frontend" cmd /k "echo Starting Vite Frontend... && npm run dev"

echo Waiting for frontend to start...
timeout /t 5 /nobreak >nul

echo.
echo ============================================
echo   System Started with Avatar Support!
echo ============================================
echo.
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:8000
echo API Docs: http://localhost:8000/docs
echo.
echo Interview Room with Avatar:
echo http://localhost:3000/candidate/interview-room
echo.
echo Avatar Status: MOCK MODE (avatar service not running)
echo.
echo To enable full avatar features:
echo 1. Follow setup in AVATAR_SETUP_GUIDE.md
echo 2. Start LiveTalking service on port 8001
echo 3. Set AVATAR_SERVICE_ENABLED=true in backend/.env
echo.
echo Press any key to open Interview Room in browser...
pause >nul

start http://localhost:3000/candidate/interview-room

echo.
echo Keep the Backend and Frontend windows open!
echo.
pause
