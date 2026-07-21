from fastapi import FastAPI, HTTPException, Body, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any, Optional
import pydantic
import json

from database import init_db, get_db_connection, log_audit_event, verify_ledger_integrity
from services.forecasting import CausalForecastingModel
from services.network_graph import NetworkGraphService
from services.action_engine import ActionEngineService
from services.credential import CredentialService
from services.compliance import ComplianceService
from services.federated_learning import FederatedLearningCoordinator

# 1. Models & Pydantic Schemas
class UserLogin(pydantic.BaseModel):
    username: str
    password: str

class ForecastRequest(pydantic.BaseModel):
    rainfall_deviation_pct: float = 0.0
    price_deviation_pct: float = 0.0
    cost_deviation_pct: float = 0.0
    rainfall_delay_weeks: float = 0.0

# Initialize services
app = FastAPI(title="NABARD AI Risk Platform Backend", version="1.0.0")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

network_service = NetworkGraphService()
action_engine = ActionEngineService()
cred_service = CredentialService()
compliance_service = ComplianceService()
fl_coordinator = FederatedLearningCoordinator()

# 2. Database seeding function
def seed_demo_data():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Clean check
    cursor.execute("SELECT COUNT(*) as count FROM enterprises")
    if cursor.fetchone()["count"] > 0:
        conn.close()
        return  # already seeded

    # Seed Users
    # Plain text passwords since it's a local sandboxed demo (no complexity needed)
    users_data = [
        ("admin_lender", "lender123", "lender"),
        ("farmer_charan", "farmer123", "entrepreneur"),
        ("farmer_sita", "farmer123", "entrepreneur"),
        ("fpo_dairy_manager", "dairy123", "entrepreneur")
    ]
    cursor.executemany("INSERT OR IGNORE INTO users VALUES (?, ?, ?)", users_data)
    
    # Seed Enterprises
    enterprises_data = [
        ("FARMER_C1", "Ram Charan (Cotton)", "cotton_village", "cotton", 11.5, 0.96, 0.12),
        ("FARMER_C2", "Sita Devi (Cotton)", "cotton_village", "cotton", 12.0, 0.72, 0.45), # distressed
        ("FARMER_C3", "Karan Singh (Cotton)", "cotton_village", "cotton", 11.8, 0.94, 0.18),
        ("FPO_DAIRY_1", "Ganga Dairy Producer Org", "dairy_village", "dairy", 10.5, 0.98, 0.08),
        ("FARMER_D1", "Amit Patel (Dairy)", "dairy_village", "dairy", 11.0, 0.97, 0.09),
        ("FARMER_D2", "Sunita Rao (Dairy)", "dairy_village", "dairy", 11.2, 0.95, 0.14),
        ("FARMER_M1", "Mule Entity A", "fraud_cluster", "cotton", 12.0, 0.90, 0.20),
        ("FARMER_M2", "Mule Entity B", "fraud_cluster", "cotton", 12.0, 0.90, 0.20),
        ("FARMER_M3", "Mule Entity C", "fraud_cluster", "cotton", 12.0, 0.90, 0.20)
    ]
    cursor.executemany("INSERT OR IGNORE INTO enterprises VALUES (?, ?, ?, ?, ?, ?, ?)", enterprises_data)
    
    # Seed Transactions (Sita Devi has weather/crop failure gaps, Mule Ring has circular transactions)
    transactions_data = [
        # Ram Charan (Clean transaction buffer)
        ("T_C1_1", "FARMER_C1", "2026-05-01T10:00:00", 25000.0, "credit", "Cotton Sale - Mandi"),
        ("T_C1_2", "FARMER_C1", "2026-05-15T14:30:00", -8000.0, "debit", "Monthly Loan Repayment"),
        ("T_C1_3", "FARMER_C1", "2026-06-01T10:00:00", 27000.0, "credit", "Cotton Sale - Mandi"),
        ("T_C1_4", "FARMER_C1", "2026-06-15T14:30:00", -8000.0, "debit", "Monthly Loan Repayment"),
        
        # Sita Devi (distressed - low revenue due to drought, misses repayments)
        ("T_C2_1", "FARMER_C2", "2026-05-01T11:00:00", 12000.0, "credit", "Cotton Sale - Low yield dry weather"),
        ("T_C2_2", "FARMER_C2", "2026-05-15T15:00:00", -8000.0, "debit", "Monthly Loan Repayment"),
        ("T_C2_3", "FARMER_C2", "2026-06-01T11:00:00", 5000.0, "credit", "Cotton Sale - Crop damaged"),
        # repayment missed in June
        
        # Ganga Dairy FPO (Strong consistent inflows)
        ("T_F1_1", "FPO_DAIRY_1", "2026-05-01T09:00:00", 125000.0, "credit", "Bulk Milk Supply Payout"),
        ("T_F1_2", "FPO_DAIRY_1", "2026-05-15T11:00:00", -12000.0, "debit", "Loan Repayment"),
        ("T_F1_3", "FPO_DAIRY_1", "2026-05-20T16:00:00", -45000.0, "debit", "Fodder Purchase"),
        ("T_F1_4", "FPO_DAIRY_1", "2026-06-01T09:00:00", 130000.0, "credit", "Bulk Milk Supply Payout"),
        ("T_F1_5", "FPO_DAIRY_1", "2026-06-15T11:00:00", -12000.0, "debit", "Loan Repayment"),
        
        # Mule Ring - Coordinated Circular Loops (Mule A -> Mule B -> Mule C -> Mule A)
        # Mule A receives 49,000 (just under threshold) and immediately passes 48,900 to Mule B
        ("T_M1_1", "FARMER_M1", "2026-06-01T12:00:00", 49000.0, "credit", "Cash Deposit"),
        ("T_M1_2", "FARMER_M1", "2026-06-01T12:10:00", -48900.0, "debit", "Transfer to Mule B"),
        
        ("T_M2_1", "FARMER_M2", "2026-06-01T12:10:00", 48900.0, "credit", "Transfer from Mule A"),
        ("T_M2_2", "FARMER_M2", "2026-06-01T12:20:00", -48800.0, "debit", "Transfer to Mule C"),
        
        ("T_M3_1", "FARMER_M3", "2026-06-01T12:20:00", 48800.0, "credit", "Transfer from Mule B"),
        ("T_M3_2", "FARMER_M3", "2026-06-01T12:30:00", -48700.0, "debit", "Transfer to Mule A")
    ]
    cursor.executemany("INSERT OR IGNORE INTO transactions VALUES (?, ?, ?, ?, ?, ?)", transactions_data)
    
    conn.commit()
    conn.close()
    
    # Log startup audit event
    log_audit_event("SYSTEM_STARTUP", "system", {"status": "success", "message": "Database seeded with demonstration village clusters."})

@app.on_event("startup")
def startup_event():
    init_db()
    seed_demo_data()

# 3. API ROUTES

@app.post("/api/auth/login")
def login(creds: UserLogin):
    """
    1. auth-service: Minimal login credential check.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE username = ? AND password_hash = ?", (creds.username, creds.password))
    user = cursor.fetchone()
    conn.close()
    
    if not user:
        log_audit_event("AUTH_FAILED", creds.username, {"reason": "invalid_credentials"})
        raise HTTPException(status_code=401, detail="Invalid username or password")
        
    log_audit_event("AUTH_SUCCESS", creds.username, {"role": user["role"]})
    return {"username": user["username"], "role": user["role"], "token": f"mock_jwt_token_for_{user['username']}"}

@app.get("/api/enterprises")
def list_enterprises(role: str = Query("lender")):
    """
    2. ingestion-service / basic model query: Lists all registered businesses.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM enterprises")
    rows = cursor.fetchall()
    conn.close()
    
    enterprises = [dict(row) for row in rows]
    
    # Layer network peer risk scores over results
    propagated_risks = network_service.propagate_peer_risk()
    fraud_rings = network_service.detect_fraud_rings()
    fraud_nodes = set()
    for ring in fraud_rings:
        fraud_nodes.update(ring["ring_nodes"])
        
    for ent in enterprises:
        ent["peer_risk_score"] = float(round(propagated_risks.get(ent["id"], ent["volatility"]), 3))
        ent["is_fraud_flagged"] = ent["id"] in fraud_nodes
        
    log_audit_event("DATA_ACCESS", role, {"resource": "enterprises_list", "count": len(enterprises)})
    return enterprises

@app.get("/api/enterprises/{ent_id}")
def get_enterprise_details(ent_id: str, role: str = Query("lender")):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM enterprises WHERE id = ?", (ent_id,))
    ent = cursor.fetchone()
    if not ent:
        conn.close()
        raise HTTPException(status_code=404, detail="Enterprise not found")
        
    cursor.execute("SELECT * FROM transactions WHERE enterprise_id = ? ORDER BY timestamp DESC", (ent_id,))
    txs = cursor.fetchall()
    conn.close()
    
    ent_dict = dict(ent)
    ent_dict["transactions"] = [dict(tx) for tx in txs]
    
    # Inject propagated risk status
    propagated_risks = network_service.propagate_peer_risk()
    ent_dict["peer_risk_score"] = float(round(propagated_risks.get(ent_id, ent_dict["volatility"]), 3))
    
    log_audit_event("DATA_ACCESS", role, {"resource": f"enterprise_details_{ent_id}"})
    return ent_dict

@app.post("/api/enterprises/{ent_id}/forecast")
def get_causal_forecast(ent_id: str, sandbox_inputs: ForecastRequest, role: str = Query("lender")):
    """
    3. forecasting-service: Uses Causal Graph Engine to project cash flow bands.
    Handles 'what-if' sandbox scenarios directly.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM enterprises WHERE id = ?", (ent_id,))
    ent = cursor.fetchone()
    conn.close()
    
    if not ent:
        raise HTTPException(status_code=404, detail="Enterprise not found")
        
    category = ent["category"]
    
    # Run causal model simulation
    forecaster = CausalForecastingModel(category)
    simulation_result = forecaster.simulate(
        rainfall_deviation_pct=sandbox_inputs.rainfall_deviation_pct,
        price_deviation_pct=sandbox_inputs.price_deviation_pct,
        cost_deviation_pct=sandbox_inputs.cost_deviation_pct,
        rainfall_delay_weeks=sandbox_inputs.rainfall_delay_weeks
    )
    
    # Calculate dynamic pricing rate
    base_rate = ent["interest_rate"]
    dyn_rate = action_engine.calculate_dynamic_rate(
        base_rate=base_rate,
        status=simulation_result["status"],
        repayment_rate=ent["repayment_rate"],
        volatility=ent["volatility"]
    )
    simulation_result["dynamic_interest_rate"] = dyn_rate
    
    # Map risk flags to actions & schemes
    mitigation_payload = action_engine.determine_interventions(
        category=category,
        forecast_status=simulation_result["status"],
        repayment_rate=ent["repayment_rate"],
        volatility=ent["volatility"],
        causal_explanations=simulation_result["explanations"]
    )
    
    simulation_result.update(mitigation_payload)
    
    log_audit_event("CAUSAL_FORECAST", role, {
        "enterprise_id": ent_id,
        "inputs": sandbox_inputs.dict(),
        "status": simulation_result["status"]
    })
    return simulation_result

@app.get("/api/enterprises/{ent_id}/credential")
def get_verifiable_credential(ent_id: str):
    """
    7. credential-service: Issues portable trust credential.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM enterprises WHERE id = ?", (ent_id,))
    ent = cursor.fetchone()
    
    if not ent:
        conn.close()
        raise HTTPException(status_code=404, detail="Enterprise not found")
        
    # Query database for existing credential
    cursor.execute("SELECT credential_json FROM credentials WHERE enterprise_id = ?", (ent_id,))
    row = cursor.fetchone()
    
    if row:
        conn.close()
        log_audit_event("CREDENTIAL_EXPORT", ent_id, {"status": "retrieved_existing"})
        return json.loads(row["credential_json"])
        
    # Generate new credential
    forecaster = CausalForecastingModel(ent["category"])
    # base forecast status
    base_forecast = forecaster.simulate()
    
    credential = cred_service.issue_credential(
        enterprise_id=ent["id"],
        enterprise_name=ent["name"],
        repayment_rate=ent["repayment_rate"],
        status=base_forecast["status"],
        stability_index=1.0 - ent["volatility"]
    )
    
    # Save to db
    cursor.execute(
        "INSERT INTO credentials (id, enterprise_id, credential_json, issued_at) VALUES (?, ?, ?, ?)",
        (credential["id"], ent["id"], json.dumps(credential), credential["issuanceDate"])
    )
    conn.commit()
    conn.close()
    
    log_audit_event("CREDENTIAL_ISSUANCE", ent_id, {"credential_id": credential["id"]})
    return credential

@app.get("/api/network/state")
def get_network_state():
    """
    4. network-graph-service: Returns full network graph state with GNN risk propagation
    and circular transaction fraud rings flagged.
    """
    log_audit_event("NETWORK_GRAPH_QUERY", "admin", {"purpose": "risk_visualization"})
    return network_service.get_full_graph_state()

@app.post("/api/federated/round")
def run_federated_round():
    """
    10. federated-learning-coordinator: Runs an aggregation round across local nodes.
    """
    metrics = fl_coordinator.run_aggregation_round()
    log_audit_event("FEDERATED_ROUND_COMPLETED", "coordinator", {
        "round": metrics["round"],
        "epsilon_spent": metrics["epsilon_spent"],
        "training_loss": metrics["training_loss"]
    })
    return metrics

@app.get("/api/federated/status")
def get_federated_status():
    return fl_coordinator.get_status()

@app.get("/api/compliance/scan/{ent_id}")
def scan_compliance(ent_id: str):
    """
    8. compliance-service: Decoupled screening checking transaction loop & PEP matching.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM enterprises WHERE id = ?", (ent_id,))
    ent = cursor.fetchone()
    
    if not ent:
        conn.close()
        raise HTTPException(status_code=404, detail="Enterprise not found")
        
    cursor.execute("SELECT * FROM transactions WHERE enterprise_id = ?", (ent_id,))
    txs = [dict(r) for r in cursor.fetchall()]
    conn.close()
    
    # Check PEP & Sanctions
    registry_check = compliance_service.check_sanctions_and_pep(ent["name"])
    
    # Scan transactions for AML structuring & layering
    aml_check = compliance_service.scan_transactions_for_aml(txs)
    
    result = {
        "enterprise_id": ent_id,
        "enterprise_name": ent["name"],
        "registry_check": registry_check,
        "aml_check": aml_check,
        "is_compliance_alert": registry_check["status"] != "clear" or aml_check["aml_status"] == "flagged"
    }
    
    log_audit_event("COMPLIANCE_SCREENING", "compliance_agent", {
        "enterprise_id": ent_id,
        "is_alert": result["is_compliance_alert"]
    })
    return result

@app.get("/api/audit/ledger")
def get_audit_ledger():
    """
    Returns entire ledger.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM audit_ledger ORDER BY id DESC")
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

@app.get("/api/audit/verify")
def verify_ledger():
    """
    Triggers cryptographic ledger integrity validation.
    """
    is_valid = verify_ledger_integrity()
    return {
        "is_intact": is_valid,
        "message": "Audit ledger chain successfully validated. Zero tampering detected." if is_valid 
                   else "CRITICAL WARNING: Hash chain mismatch detected. Ledger tampered!"
    }

class BlacklistRequest(pydantic.BaseModel):
    name: str
    category: str  # "sanction" or "pep"

@app.get("/api/enterprises/{ent_id}/sensitivity")
def get_sensitivity_data(ent_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM enterprises WHERE id = ?", (ent_id,))
    ent = cursor.fetchone()
    conn.close()
    
    if not ent:
        raise HTTPException(status_code=404, detail="Enterprise not found")
        
    category = ent["category"]
    forecaster = CausalForecastingModel(category)
    
    # Rainfall sweep: -50 to 50
    rainfall_sweep = []
    for r_dev in range(-50, 51, 10):
        sim = forecaster.simulate(rainfall_deviation_pct=float(r_dev))
        rainfall_sweep.append({
            "deviation": r_dev,
            "median_cash_flow": sim["forecast_bands"]["median"],
            "expected_yield": sim["expected_yield_kg"],
            "status": sim["status"]
        })
        
    # Price sweep: -40 to 40
    price_sweep = []
    for p_dev in range(-40, 41, 10):
        sim = forecaster.simulate(price_deviation_pct=float(p_dev))
        price_sweep.append({
            "deviation": p_dev,
            "median_cash_flow": sim["forecast_bands"]["median"],
            "status": sim["status"]
        })
        
    # Cost sweep: -20 to 40
    cost_sweep = []
    for c_dev in range(-20, 41, 10):
        sim = forecaster.simulate(cost_deviation_pct=float(c_dev))
        cost_sweep.append({
            "deviation": c_dev,
            "median_cash_flow": sim["forecast_bands"]["median"],
            "status": sim["status"]
        })

    # Delay weeks sweep: 0 to 6
    delay_sweep = []
    for weeks in range(0, 7):
        sim = forecaster.simulate(rainfall_delay_weeks=float(weeks))
        delay_sweep.append({
            "weeks": weeks,
            "median_cash_flow": sim["forecast_bands"]["median"],
            "status": sim["status"]
        })
        
    return {
        "enterprise_id": ent_id,
        "category": category,
        "rainfall_sweep": rainfall_sweep,
        "price_sweep": price_sweep,
        "cost_sweep": cost_sweep,
        "delay_sweep": delay_sweep
    }

@app.post("/api/compliance/add-blacklisted")
def add_blacklisted_name(data: BlacklistRequest):
    if data.category not in ["sanction", "pep"]:
        raise HTTPException(status_code=400, detail="Invalid compliance category. Must be 'sanction' or 'pep'.")
    compliance_service.add_blacklisted_entity(data.name, data.category)
    log_audit_event("COMPLIANCE_BLACKLIST_ADD", "compliance_agent", {"name": data.name, "category": data.category})
    return {"message": f"Successfully blacklisted '{data.name}' under '{data.category}'."}

@app.post("/api/compliance/reset")
def reset_compliance():
    compliance_service.reset_registries()
    log_audit_event("COMPLIANCE_RESET", "compliance_agent", {"message": "Compliance registry reset to default values."})
    return {"message": "Compliance registries reset successfully."}

class InterventionRequest(pydantic.BaseModel):
    node_id: str
    action_code: str

@app.post("/api/network/intervene")
def apply_network_intervention(data: InterventionRequest):
    if data.action_code == "CLEAR":
        if data.node_id in network_service.interventions:
            del network_service.interventions[data.node_id]
        log_audit_event("INTERVENTION_CLEAR", "admin", {"node_id": data.node_id})
    else:
        reduction = 0.0
        if data.action_code == "SHIFT_REPAYMENT_DATE":
            reduction = 0.65
        elif data.action_code == "RECEIVABLES_BRIDGE_LOAN":
            reduction = 0.70
        elif data.action_code == "BUFFER_OPTIMIZE":
            reduction = 0.20
        elif data.action_code == "GROWTH_NUDGE":
            reduction = 0.10
            
        network_service.interventions[data.node_id] = reduction
        log_audit_event("INTERVENTION_APPLY", "admin", {"node_id": data.node_id, "action": data.action_code, "reduction": reduction})
        
    return network_service.get_full_graph_state()

@app.post("/api/credential/verify")
def verify_verifiable_credential(payload: Dict[str, Any] = Body(...)):
    is_valid = cred_service.verify_credential(payload)
    if is_valid:
        return {
            "is_valid": True,
            "status": "success",
            "message": "Cryptographic signature verified. Credential has NOT been tampered with.",
            "details": {
                "issuer": payload.get("issuer"),
                "subject": payload.get("credentialSubject", {}),
                "issuanceDate": payload.get("issuanceDate"),
                "proofType": payload.get("proof", {}).get("type")
            }
        }
    else:
        return {
            "is_valid": False,
            "status": "failed",
            "message": "CRITICAL WARNING: Cryptographic signature mismatch. Credential verification failed!"
        }

@app.get("/api/market/feeds")
def get_market_feeds():
    # Return 30-day index curves
    days = [f"Day {i+1}" for i in range(30)]
    
    # Rainfall deviation simulation
    rainfall_feed = [float(round(-10.0 + i*0.4 + (i%3)*2.5 - (i%5)*1.8, 1)) for i in range(30)]
    
    # Wholesale Price deviations
    cotton_price = [float(round(80.0 + (i*0.2) + (i%2)*3.0 - (i%4)*2.0, 1)) for i in range(30)]
    dairy_price = [float(round(45.0 + (i*0.08) - (i%3)*1.5 + (i%2)*2.0, 1)) for i in range(30)]
    rice_price = [float(round(30.0 + (i*0.05) + (i%5)*1.0 - (i%3)*1.2, 1)) for i in range(30)]
    
    return {
        "days": days,
        "rainfall_feed": rainfall_feed,
        "prices": {
            "cotton": cotton_price,
            "dairy": dairy_price,
            "rice": rice_price
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
