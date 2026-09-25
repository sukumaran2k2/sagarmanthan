"""
MS SQL Server connection pool for Sagarmanthan AI service.
Uses pyodbc with connection pooling.
"""
import os
import pyodbc
from dotenv import load_dotenv

load_dotenv()

DB_SERVER   = os.getenv("DB_SERVER",   "localhost")
DB_NAME     = os.getenv("DB_NAME",     "sagarmanthan_revamp")
DB_USER     = os.getenv("DB_USER",     "sa")
DB_PASSWORD = os.getenv("DB_PASSWORD", "root")
DB_DRIVER   = os.getenv("DB_DRIVER",   "ODBC Driver 17 for SQL Server")

CONNECTION_STRING = (
    f"DRIVER={{{DB_DRIVER}}};"
    f"SERVER={DB_SERVER};"
    f"DATABASE={DB_NAME};"
    f"UID={DB_USER};"
    f"PWD={DB_PASSWORD};"
    "TrustServerCertificate=yes;"
    "Timeout=30;"
)

def get_connection():
    """Return a new pyodbc connection."""
    return pyodbc.connect(CONNECTION_STRING, timeout=30)


def execute_query(sql: str) -> list[dict]:
    """
    Execute a read-only SQL query and return results as list of dicts.
    Raises ValueError if query is not read-only.
    """
    # Safety check - only allow SELECT statements
    clean = sql.strip().upper()
    if not clean.startswith("SELECT") and not clean.startswith("WITH"):
        raise ValueError("Only SELECT/WITH queries are permitted.")

    dangerous_keywords = ["INSERT", "UPDATE", "DELETE", "DROP", "TRUNCATE", "ALTER", "EXEC", "EXECUTE", "XP_"]
    for kw in dangerous_keywords:
        if kw in clean:
            raise ValueError(f"Dangerous SQL keyword detected: {kw}")

    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(sql)
        columns = [col[0] for col in cursor.description]
        rows = cursor.fetchall()
        conn.close()
        return [dict(zip(columns, row)) for row in rows]
    except pyodbc.Error as e:
        raise RuntimeError(f"Database error: {str(e)}")


def test_connection() -> bool:
    """Test if DB is reachable."""
    try:
        conn = get_connection()
        conn.close()
        return True
    except Exception:
        return False
