@echo off
echo ==========================================
echo   Sagarmanthan AI Service — Startup
echo ==========================================

REM Step 1: Create virtual environment if not exists
if not exist "venv" (
    echo [1/4] Creating Python virtual environment...
    python -m venv venv
)

REM Step 2: Activate virtual environment
echo [2/4] Activating virtual environment...
call venv\Scripts\activate.bat

REM Step 3: Install dependencies
echo [3/4] Installing dependencies...
pip install -r requirements.txt --quiet

REM Step 4: Copy .env.example if .env doesn't exist
if not exist ".env" (
    echo [INFO] .env not found. Copying from .env.example...
    copy .env.example .env
    echo [IMPORTANT] Please edit ai-service\.env and add your OPENAI_API_KEY!
)

REM Step 5: Start the service
echo [4/4] Starting FastAPI server on port 8000...
echo.
echo ==========================================
echo   Service running at: http://localhost:8000
echo   Health check:       http://localhost:8000/health
echo   API docs:           http://localhost:8000/docs
echo ==========================================
echo.
python main.py

pause
