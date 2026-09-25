@echo off
echo ========================================================
echo   Sagarmanthan Revamp — Launching All Services
echo ========================================================
echo.

echo [1/3] Starting AI Service (Python FastAPI on port 8000)...
start "Sagarmanthan AI Service (Port 8000)" cmd /k "cd /d "%~dp0ai-service" && .\venv\Scripts\python.exe main.py"

echo [2/3] Starting Backend Server (Node.js Express on port 3000)...
start "Sagarmanthan Backend (Port 3000)" cmd /k "cd /d "%~dp0backend" && npm start"

echo [3/3] Starting Frontend App (React Vite on port 5173)...
start "Sagarmanthan Frontend (Port 5173)" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo ========================================================
echo   All 3 services are launching in separate windows!
echo   - AI Microservice: http://localhost:8000
echo   - Node.js Backend: http://localhost:3000
echo   - React Frontend:  http://localhost:5173
echo ========================================================
pause
