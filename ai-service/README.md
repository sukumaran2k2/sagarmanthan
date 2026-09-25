# Sagarmanthan Python AI Service

FastAPI microservice for Text-to-SQL AI intelligence using GPT-4o-mini + MS SQL Server.

## Quick Start (Windows)

1. Install Python 3.11+ from https://python.org/downloads (check Add to PATH)
2. Install ODBC Driver 17: https://aka.ms/odbc17
3. Edit .env with your DB credentials and OpenAI key
4. Double-click start.bat

## Files

- main.py    - FastAPI app, POST /api/copilot/query
- llm.py     - LLM engine: generates SQL + insight JSON
- database.py - MS SQL Server connector (read-only, safe)
- schema.py  - DB schema context for LLM grounding
- start.bat  - One-click Windows startup

## Endpoints

- GET  /health              - Health check (DB + OpenAI status)
- POST /api/copilot/query   - Main AI query endpoint
- GET  /docs                - Interactive API documentation

## .env Setup

DB_SERVER=localhost
DB_NAME=sagarmanthan_revamp
DB_USER=sa
DB_PASSWORD=root
DB_DRIVER=ODBC Driver 17 for SQL Server
OPENAI_API_KEY=sk-proj-xxxxxx
PORT=8000
