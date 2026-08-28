@echo off
echo ========================================
echo Starting NeuroHire AI with Avatar Service
echo ========================================
echo.

echo This will start 3 services:
echo 1. LiveTalking Avatar Service (Port 8010)
echo 2. Backend API (Port 8000)  
echo 3. Frontend (Port 3000)
echo.
echo Press Ctrl+C to stop all services
echo ========================================
echo.

start "LiveTalking Avatar" cmd /k "cd avatar-service && py app.py --transport webrtc --model wav2lip --avatar_id wav2lip256_avatar1"

timeout /t 5

start "Backend API" cmd /k "cd backend && py -m uvicorn app.main:app --reload --port 8000"

timeout /t 3

start "Frontend" cmd /k "npm run dev"

echo.
echo ========================================
echo All services starting...
echo ========================================
echo.
echo LiveTalking Avatar: http://localhost:8010/index.html
echo Backend API: http://localhost:8000/docs
echo Frontend: http://localhost:3000
echo Interview Room: http://localhost:3000/candidate/interview-room
echo.
echo Press any key to close this window (services will keep running)
pause
