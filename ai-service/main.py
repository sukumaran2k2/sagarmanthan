"""
Sagarmanthan AI Service — FastAPI microservice
Port: 8000
Endpoint: POST /api/copilot/query
Called by Node.js backend (routes.js) or directly by frontend.
"""
import os
import asyncio
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from dotenv import load_dotenv
from database import test_connection
from llm import process_query

load_dotenv()

app = FastAPI(
    title="Sagarmanthan AI Copilot",
    description="Text-to-SQL LLM microservice for Ministry of Ports, Shipping and Waterways",
    version="1.0.0"
)

# Allow calls from Node.js backend and React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request / Response models ─────────────────────────────────────────────────

class ConversationMessage(BaseModel):
    role: str      # 'user' | 'bot' | 'assistant'
    text: str


class CopilotRequest(BaseModel):
    query: str
    portName: Optional[str] = None
    viewType: Optional[str] = "ministry"   # 'ministry' | 'org'
    conversationHistory: Optional[list[ConversationMessage]] = []


class CopilotResponse(BaseModel):
    success: bool
    data: dict
    source: str


# ── Health Check ─────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    db_ok = test_connection()
    api_key_ok = bool(os.getenv("OPENAI_API_KEY", "").strip())
    return {
        "status": "ok",
        "db_connected": db_ok,
        "openai_configured": api_key_ok,
        "service": "Sagarmanthan AI Copilot v1.0"
    }


# ── Main Copilot Endpoint ─────────────────────────────────────────────────────

@app.post("/api/copilot/query", response_model=CopilotResponse)
async def copilot_query(req: CopilotRequest):
    if not req.query or len(req.query.strip()) < 1:
        raise HTTPException(status_code=400, detail="Query cannot be empty.")

    history = [{"role": m.role, "text": m.text} for m in (req.conversationHistory or [])]

    try:
        data = await process_query(
            question=req.query.strip(),
            port_name=req.portName,
            view_type=req.viewType or "ministry",
            conversation_history=history
        )
        source = data.pop("_meta", {}).get("source", "python")
        return CopilotResponse(success=True, data=data, source=source)

    except Exception as e:
        # Return error as a graceful bot message
        return CopilotResponse(
            success=True,
            data={
                "summary": f"I encountered an issue processing your query: {str(e)[:200]}",
                "keyMetrics": [],
                "visualizationType": "none",
                "suggestedFollowUps": [
                    "Show court case summary for all ports",
                    "What is the Capex utilisation this quarter?",
                    "Show GEM procurement compliance status"
                ]
            },
            source="error_fallback"
        )


# ── Direct SQL Endpoint (for debugging) ──────────────────────────────────────

class SQLRequest(BaseModel):
    sql: str
    secret: str   # simple shared secret to prevent abuse


@app.post("/api/debug/sql")
async def debug_sql(req: SQLRequest):
    expected_secret = os.getenv("DEBUG_SECRET", "sagarmanthan-dev-only")
    if req.secret != expected_secret:
        raise HTTPException(status_code=403, detail="Invalid secret.")

    from database import execute_query
    try:
        rows = execute_query(req.sql)
        return {"success": True, "row_count": len(rows), "data": rows[:50]}
    except Exception as e:
        return {"success": False, "error": str(e)}


# ── Entry point ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
