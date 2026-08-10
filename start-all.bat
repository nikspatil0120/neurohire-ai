@echo off
echo ============================================
echo   NeuroHire AI - System Startup
echo ============================================
echo.

echo Starting MongoDB...
net start MongoDB
if %errorlevel% neq 0 (
    echo Warning: MongoDB service not found or already running
    echo If MongoDB is not running, start it manually: mongod
)
echo.

echo Starting Backend Server (new window)...
start "NeuroHire Backend" cmd /k "cd backend && echo Starting FastAPI Backend... && python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

echo Waiting for backend to start...
timeout /t 5 /nobreak >nul

echo Starting Frontend Dev Server (new window)...
start "NeuroHire Frontend" cmd /k "echo Starting Vite Frontend... && npm run dev"

echo Waiting for frontend to start...
timeout /t 5 /nobreak >nul

echo Opening browser...
start http://localhost:5173

echo.
echo ============================================
echo   System Started!
echo ============================================
echo.
echo Frontend: http://localhost:5173
echo Backend:  http://localhost:8000
echo API Docs: http://localhost:8000/docs
echo.
echo Admin Login:
echo   Email:    admin@xyz.com
echo   Password: admin@123
echo.
echo Keep the Backend and Frontend windows open!
echo.
pause
