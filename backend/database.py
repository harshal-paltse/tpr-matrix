import sqlite3
import json
import hashlib
from datetime import datetime
import os

DATABASE_PATH = os.path.join(os.path.dirname(__file__), "system.db")

def get_db_connection():
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 1. Users Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        username TEXT PRIMARY KEY,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL
    )
    """)
    
    # 2. Enterprises Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS enterprises (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        village_node TEXT NOT NULL,
        category TEXT NOT NULL,
        interest_rate REAL NOT NULL,
        repayment_rate REAL NOT NULL,
        volatility REAL NOT NULL
    )
    """)
    
    # 3. Transactions Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        enterprise_id TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        amount REAL NOT NULL,
        type TEXT NOT NULL,
        description TEXT NOT NULL,
        FOREIGN KEY(enterprise_id) REFERENCES enterprises(id)
    )
    """)
    
    # 4. Weather Data Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS weather_data (
        village_node TEXT NOT NULL,
        date TEXT NOT NULL,
        rainfall_mm REAL NOT NULL,
        temperature REAL NOT NULL,
        PRIMARY KEY (village_node, date)
    )
    """)
    
    # 5. Commodity Prices Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS commodity_prices (
        category TEXT NOT NULL,
        date TEXT NOT NULL,
        price_per_kg REAL NOT NULL,
        PRIMARY KEY (category, date)
    )
    """)

    # 6. Credentials Table (W3C Verifiable Credentials storage)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS credentials (
        id TEXT PRIMARY KEY,
        enterprise_id TEXT NOT NULL,
        credential_json TEXT NOT NULL,
        issued_at TEXT NOT NULL,
        FOREIGN KEY(enterprise_id) REFERENCES enterprises(id)
    )
    """)

    # 7. Audit Ledger Table (Tamper-proof hash chain)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS audit_ledger (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        event_type TEXT NOT NULL,
        actor TEXT NOT NULL,
        payload TEXT NOT NULL,
        prev_hash TEXT NOT NULL,
        hash TEXT NOT NULL
    )
    """)
    
    conn.commit()
    conn.close()

def compute_hash(timestamp: str, event_type: str, actor: str, payload: str, prev_hash: str) -> str:
    hash_input = f"{timestamp}|{event_type}|{actor}|{payload}|{prev_hash}"
    return hashlib.sha256(hash_input.encode("utf-8")).hexdigest()

def log_audit_event(event_type: str, actor: str, payload_dict: dict) -> str:
    """
    Appends an event to the audit ledger, computing the hash linked to the previous block.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Get last block hash
    cursor.execute("SELECT hash FROM audit_ledger ORDER BY id DESC LIMIT 1")
    row = cursor.fetchone()
    prev_hash = row["hash"] if row else "0000000000000000000000000000000000000000000000000000000000000000"
    
    timestamp = datetime.utcnow().isoformat()
    payload_str = json.dumps(payload_dict)
    
    event_hash = compute_hash(timestamp, event_type, actor, payload_str, prev_hash)
    
    cursor.execute("""
    INSERT INTO audit_ledger (timestamp, event_type, actor, payload, prev_hash, hash)
    VALUES (?, ?, ?, ?, ?, ?)
    """, (timestamp, event_type, actor, payload_str, prev_hash, event_hash))
    
    conn.commit()
    conn.close()
    return event_hash

def verify_ledger_integrity() -> bool:
    """
    Verifies the entire hash chain from start to end.
    Returns True if intact, False if tampered.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM audit_ledger ORDER BY id ASC")
    rows = cursor.fetchall()
    conn.close()
    
    expected_prev_hash = "0000000000000000000000000000000000000000000000000000000000000000"
    for row in rows:
        # Check chain link
        if row["prev_hash"] != expected_prev_hash:
            return False
            
        # Check hash correctness
        calculated_hash = compute_hash(
            row["timestamp"], 
            row["event_type"], 
            row["actor"], 
            row["payload"], 
            row["prev_hash"]
        )
        if row["hash"] != calculated_hash:
            return False
            
        expected_prev_hash = row["hash"]
        
    return True
