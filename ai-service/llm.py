"""
LLM engine for Sagarmanthan AI:
1. Generates SQL from user question using OpenAI
2. Executes SQL on MS SQL Server
3. Returns structured JSON (summary + chart/table config)
"""
import os
import json
import re
from openai import OpenAI
from schema import DB_SCHEMA
from database import execute_query

client = None

def get_client() -> OpenAI | None:
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        return None
    return OpenAI(api_key=api_key)


SQL_SYSTEM_PROMPT = f"""You are a Microsoft SQL Server expert for the Sagarmanthan portal (Ministry of Ports, Shipping and Waterways, Government of India).

Given a natural language question, generate a safe, accurate T-SQL SELECT query.

DATABASE SCHEMA:
{DB_SCHEMA}

RULES:
- Return ONLY a JSON object with two keys:
  {{ "sql": "your T-SQL SELECT query here", "chart_hint": "bar|line|pie|area|table|none" }}
- Only use SELECT / WITH CTEs. No INSERT/UPDATE/DELETE.
- Use TOP 200 for any unbounded queries.
- Prefer aggregations (COUNT, SUM, AVG) over raw row dumps when the question asks for insights.
- chart_hint: choose the best visualization for the result.
- If the question cannot be answered with DB data, set sql to empty string and chart_hint to "none".
"""

INSIGHT_SYSTEM_PROMPT = """You are SagarBot, an executive data analyst for the Ministry of Ports, Shipping and Waterways, Government of India.

Given a user question, the SQL query executed, and the data results, generate a JSON analysis response.

Return ONLY this JSON schema:
{
  "summary": "Executive narrative (2-3 sentences, factual, specific numbers)",
  "keyMetrics": [
    { "label": "string", "value": "string or number", "trend": "string", "status": "positive|negative|neutral" }
  ],
  "visualizationType": "bar|line|pie|area|table|none",
  "chartConfig": {
    "title": "string",
    "xAxisKey": "string (column name for X axis)",
    "dataKeys": [{ "key": "column_name", "label": "display label", "color": "#hex" }],
    "data": [ array of row objects ]
  },
  "tableConfig": {
    "title": "string",
    "headers": ["column 1", "column 2"],
    "rows": [["val", "val"]]
  },
  "suggestedFollowUps": ["question 1", "question 2", "question 3"]
}

COLORS to use: #0EA5E9, #10B981, #F59E0B, #EF4444, #8B5CF6, #EC4899, #06B6D4
"""


def generate_sql(question: str, port_name: str | None, view_type: str) -> dict:
    """Ask LLM to generate SQL + chart hint from user question."""
    llm = get_client()
    if not llm:
        return {"sql": "", "chart_hint": "none"}

    context = f"Port Authority filter: {port_name}" if port_name else "Ministry-level view (all port authorities)"
    prompt = f"Question: {question}\nContext: {context}\nView type: {view_type}"

    response = llm.chat.completions.create(
        model="gpt-4o-mini",
        response_format={"type": "json_object"},
        temperature=0.1,
        max_tokens=600,
        messages=[
            {"role": "system", "content": SQL_SYSTEM_PROMPT},
            {"role": "user",   "content": prompt}
        ]
    )
    return json.loads(response.choices[0].message.content)


def generate_insight(question: str, sql: str, data: list[dict], chart_hint: str, port_name: str | None) -> dict:
    """Ask LLM to generate structured insight JSON from query results."""
    llm = get_client()
    if not llm:
        return _fallback_insight(question, data, chart_hint, port_name)

    # Limit data to first 50 rows for context (avoid token overflow)
    sample_data = data[:50]

    prompt = f"""User question: {question}
Port/Context: {port_name or 'All Ports (Ministry View)'}
SQL executed: {sql}
Row count: {len(data)}
Data sample: {json.dumps(sample_data, default=str)}
Suggested chart: {chart_hint}

Generate a structured JSON analysis response."""

    response = llm.chat.completions.create(
        model="gpt-4o-mini",
        response_format={"type": "json_object"},
        temperature=0.2,
        max_tokens=1500,
        messages=[
            {"role": "system", "content": INSIGHT_SYSTEM_PROMPT},
            {"role": "user",   "content": prompt}
        ]
    )
    return json.loads(response.choices[0].message.content)


def _fallback_insight(question: str, data: list[dict], chart_hint: str, port_name: str | None) -> dict:
    """Generate a basic insight without OpenAI when no API key is set."""
    port = port_name or "All Ports"
    row_count = len(data)

    if not data:
        return {
            "summary": f"No data found for your query about '{question}' for {port}.",
            "keyMetrics": [],
            "visualizationType": "none",
            "suggestedFollowUps": [
                "Show module compliance status for all ports",
                "How many court cases are currently active?",
                "What is the Capex utilisation this quarter?"
            ]
        }

    # Auto-build table config from data
    headers = list(data[0].keys())
    rows = [[str(row.get(h, "")) for h in headers] for row in data[:20]]

    return {
        "summary": f"Found {row_count} records for your query. {port} data is displayed below.",
        "keyMetrics": [{"label": "Total Records", "value": row_count, "trend": "", "status": "neutral"}],
        "visualizationType": "table",
        "tableConfig": {
            "title": f"Query Results — {port}",
            "headers": headers,
            "rows": rows
        },
        "suggestedFollowUps": [
            "Show a chart of this data",
            "Filter by a specific financial year",
            "Compare across all port authorities"
        ]
    }


def is_greeting(question: str) -> bool:
    """Check if query is a simple greeting, thank you, or identity question."""
    q = question.strip().lower()
    cleaned = re.sub(r'[^\w\s]', '', q).strip()
    
    greetings = {
        'hi', 'hai', 'hello', 'hey', 'helo', 'hlo', 'hy', 'namaste',
        'good morning', 'good afternoon', 'good evening',
        'who are you', 'what can you do', 'help', 'thanks', 'thank you', 'tq', 'thx'
    }
    
    if cleaned in greetings:
        return True
    
    words = cleaned.split()
    if len(words) <= 3 and words and words[0] in ['hi', 'hai', 'hello', 'hey', 'helo', 'hlo', 'namaste']:
        # e.g., "hai bot", "hello SagarBot", "hi team"
        return True
        
    return False


def get_greeting_response(port_name: str | None) -> dict:
    """Return a warm, helpful greeting response."""
    context = f"for **{port_name}**" if port_name else "across all Major Port Authorities"
    return {
        "summary": f"Hello! 👋 I am **SagarBot AI Copilot**, your real-time Ministry Intelligence assistant for the Sagarmanthan portal.\n\nI can analyze live database metrics, render dynamic charts & data tables, and provide executive insights {context}. How can I assist you today?",
        "keyMetrics": [],
        "visualizationType": "none",
        "suggestedFollowUps": [
            "How many court cases are currently active?",
            "Show Capex utilization vs targets",
            "What is the GEM procurement compliance status?",
            "Show MIV 2030 interventions status"
        ],
        "_meta": {
            "sql_executed": "",
            "row_count": 0,
            "sql_error": None,
            "source": "greeting_handler"
        }
    }


async def process_query(question: str, port_name: str | None, view_type: str, conversation_history: list) -> dict:
    """
    Main pipeline:
      1. Check if greeting -> return friendly introduction
      2. LLM generates SQL
      3. SQL executes on DB
      4. LLM generates insight from data
      5. Return structured JSON
    """
    # Step 0: Check if it's a greeting / general query
    if is_greeting(question):
        return get_greeting_response(port_name)

    # Step 1: Generate SQL
    sql_result = generate_sql(question, port_name, view_type)
    sql = sql_result.get("sql", "").strip()
    chart_hint = sql_result.get("chart_hint", "none")

    # Step 2: Execute SQL
    data = []
    sql_error = None
    if sql:
        try:
            data = execute_query(sql)
        except Exception as e:
            sql_error = str(e)
            sql = ""

    # Step 3: Generate insight
    insight = generate_insight(question, sql, data, chart_hint, port_name)

    # Append metadata
    insight["_meta"] = {
        "sql_executed": sql,
        "row_count": len(data),
        "sql_error": sql_error,
        "source": "openai+mssql" if sql else "openai_only"
    }

    return insight

