"""
test_api.py

Unit + integration tests for the FedXplain API. Run with:
    PYTHONPATH=. pytest tests/ -v

Uses a fresh in-memory SQLite DB per test session so tests never touch
your real fedxplain.db, and are fully repeatable/CI-friendly.
"""

import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

os.environ["DATABASE_URL"] = "sqlite:///:memory:"

from app.main import app
from app.db.db_models import Base, get_db


@pytest.fixture(scope="function")
def client():
    # Fresh in-memory DB engine per test function -- full isolation.
    # StaticPool is required for SQLite ":memory:" so every connection
    # checked out of the pool shares the SAME in-memory database instead
    # of each getting its own empty one.
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as c:
        yield c

    app.dependency_overrides.clear()


def register_and_login(client, email, role="fraud_analyst", password="TestPass123"):
    client.post("/auth/register", json={
        "email": email, "password": password, "full_name": "Test User", "role": role,
    })
    r = client.post("/auth/login", json={"email": email, "password": password})
    return r.json()["access_token"]


class TestHealth:
    def test_health_check_returns_200(self, client):
        r = client.get("/health")
        assert r.status_code == 200
        assert r.json()["status"] == "ok"


class TestAuth:
    def test_register_creates_user(self, client):
        r = client.post("/auth/register", json={
            "email": "newuser@example.com", "password": "SecurePass123",
            "full_name": "New User", "role": "fraud_analyst",
        })
        assert r.status_code == 201
        assert r.json()["email"] == "newuser@example.com"
        assert r.json()["role"] == "fraud_analyst"

    def test_register_duplicate_email_fails(self, client):
        payload = {"email": "dupe@example.com", "password": "SecurePass123", "role": "auditor"}
        client.post("/auth/register", json=payload)
        r = client.post("/auth/register", json=payload)
        assert r.status_code == 400

    def test_register_rejects_invalid_role(self, client):
        r = client.post("/auth/register", json={
            "email": "badrole@example.com", "password": "SecurePass123", "role": "superuser",
        })
        assert r.status_code == 422

    def test_login_success_returns_tokens(self, client):
        client.post("/auth/register", json={
            "email": "loginme@example.com", "password": "SecurePass123", "role": "admin",
        })
        r = client.post("/auth/login", json={"email": "loginme@example.com", "password": "SecurePass123"})
        assert r.status_code == 200
        body = r.json()
        assert "access_token" in body and "refresh_token" in body

    def test_login_wrong_password_fails(self, client):
        client.post("/auth/register", json={
            "email": "wrongpw@example.com", "password": "SecurePass123", "role": "admin",
        })
        r = client.post("/auth/login", json={"email": "wrongpw@example.com", "password": "WrongPassword"})
        assert r.status_code == 401

    def test_predict_without_token_is_rejected(self, client):
        r = client.post("/predict", json={"Time": 1.0, "V": [0.0]*28, "Amount": 10.0})
        assert r.status_code == 401


class TestRoleBasedAccess:
    def test_fraud_analyst_can_call_predict(self, client):
        token = register_and_login(client, "analyst1@example.com", role="fraud_analyst")
        r = client.post(
            "/predict", json={"Time": 1.0, "V": [0.0] * 28, "Amount": 10.0},
            headers={"Authorization": f"Bearer {token}"},
        )
        # 503 expected since no model is registered in this isolated test DB --
        # the important assertion is that RBAC let the request through (not 403).
        assert r.status_code in (200, 503)

    def test_auditor_cannot_call_predict(self, client):
        token = register_and_login(client, "auditor1@example.com", role="auditor")
        r = client.post(
            "/predict", json={"Time": 1.0, "V": [0.0] * 28, "Amount": 10.0},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r.status_code == 403

    def test_auditor_can_view_audit_logs(self, client):
        token = register_and_login(client, "auditor2@example.com", role="auditor")
        r = client.get("/audit/logs", headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 200

    def test_fraud_analyst_cannot_view_audit_logs(self, client):
        token = register_and_login(client, "analyst2@example.com", role="fraud_analyst")
        r = client.get("/audit/logs", headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 403

    def test_only_admin_can_activate_model_version(self, client):
        token = register_and_login(client, "analyst3@example.com", role="fraud_analyst")
        r = client.post("/models/activate/v1.0.0", headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 403


class TestBatchCSV:
    def test_batch_upload_rejects_non_csv(self, client):
        token = register_and_login(client, "batchuser@example.com", role="admin")
        r = client.post(
            "/predict/batch-csv",
            files={"file": ("test.txt", b"not a csv", "text/plain")},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r.status_code == 400

    def test_batch_upload_rejects_missing_columns(self, client):
        token = register_and_login(client, "batchuser2@example.com", role="admin")
        bad_csv = b"Time,Amount\n100,50.0\n"
        r = client.post(
            "/predict/batch-csv",
            files={"file": ("test.csv", bad_csv, "text/csv")},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r.status_code == 400
        assert "missing required columns" in r.json()["detail"]
