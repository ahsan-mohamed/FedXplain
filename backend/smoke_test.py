"""
smoke_test.py — quick manual verification that the whole app wires together
correctly: register -> login -> role-gated predict -> audit log -> docs.
Not a substitute for tests/test_api.py (proper pytest suite), just a fast
sanity check while developing.
"""
from fastapi.testclient import TestClient
from app.main import app

with TestClient(app) as client:
    print("1. Health check:")
    r = client.get("/health")
    print(" ", r.status_code, r.json())

    print("\n2. Register admin user:")
    r = client.post("/auth/register", json={
    "email": "admin@fedxplain.example.com", "password": "SuperSecret123",
    "full_name": "Admin User", "role": "admin"
    })
    print(" ", r.status_code, r.json() if r.status_code < 300 else r.text)

    print("\n3. Register auditor user:")
    r = client.post("/auth/register", json={
    "email": "auditor@fedxplain.example.com", "password": "AuditPass123",
    "full_name": "Audit User", "role": "auditor"
    })
    print(" ", r.status_code)

    print("\n4. Login as admin:")
    r = client.post("/auth/login", json={"email": "admin@fedxplain.example.com", "password": "SuperSecret123"})
    print(" ", r.status_code)
    tokens = r.json()
    access_token = tokens["access_token"]

    print("\n5. Predict with real trained model loaded:")
    import pandas as pd
    fraud_row = pd.read_csv("data/partitioned/bank_1.csv")
    fraud_row = fraud_row[fraud_row["Class"] == 1].iloc[0]
    feats = fraud_row.drop("Class")
    v_cols = [c for c in feats.index if c.startswith("V")]
    headers = {"Authorization": f"Bearer {access_token}"}
    r = client.post("/predict", json={
        "Time": float(feats["Time"]),
        "V": [float(feats[c]) for c in v_cols],
        "Amount": float(feats["Amount"]),
    }, headers=headers)
    print(" ", r.status_code, r.json())

    print("\n6. Login as auditor, try /predict (expect 403 - wrong role):")
    r = client.post("/auth/login", json={"email": "auditor@fedxplain.example.com", "password": "AuditPass123"})
    auditor_token = r.json()["access_token"]
    r = client.post("/predict", json={"Time": 1000.0, "V": [0.1]*28, "Amount": 50.0},
                headers={"Authorization": f"Bearer {auditor_token}"})
    print(" ", r.status_code, r.json())

    print("\n7. Auditor CAN view audit logs (expect 200):")
    r = client.get("/audit/logs", headers={"Authorization": f"Bearer {auditor_token}"})
    print(" ", r.status_code, f"({len(r.json())} entries)")

    print("\n8. Admin CAN also view audit logs:")
    r = client.get("/audit/logs", headers=headers)
    print(" ", r.status_code, f"({len(r.json())} entries)")

    print("\n9. Swagger docs available:")
    r = client.get("/openapi.json")
    print(" ", r.status_code, f"({len(r.json()['paths'])} documented endpoints)")

    print("\n10. Get plain-English explanation for that transaction:")
    txn_id = 1
    r = client.get(f"/explain/{txn_id}", headers=headers)
    print(" ", r.status_code)
    print(" ", r.json().get("llm_narrative", r.text))

    print("\n11. Get Basel III-style audit narrative for that transaction:")
    r = client.get(f"/explain/{txn_id}/basel", headers=headers)
    print(" ", r.status_code)
    print(" ", r.json().get("llm_narrative", r.text))

    print("\n12. Combined predict+explain in one call:")
    r = client.post("/predict/explained", json={
        "Time": float(feats["Time"]),
        "V": [float(feats[c]) for c in v_cols],
        "Amount": float(feats["Amount"]),
    }, headers=headers)
    print(" ", r.status_code)
    body = r.json()
    print(f"   fraud_probability={body.get('fraud_probability')}")
    print(f"   narrative={body.get('llm_narrative')}")

print("\nAll smoke checks completed.")
