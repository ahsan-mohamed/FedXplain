"""
routes_predict.py

- POST /predict            : score a single transaction (Fraud Analyst, Admin)
- POST /predict/batch-csv   : upload a CSV, score every row (Fraud Analyst, Admin)
- GET  /models/versions     : list all model versions (all roles, read-only)
- POST /models/activate     : switch the active model version (Admin only)

Every prediction is logged to the Transaction table and an AuditLog row.
High-probability fraud triggers both a WebSocket broadcast and an email
alert (best-effort; failures are logged, not fatal to the request).
"""

import io
import uuid
from datetime import datetime, timezone

import numpy as np
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request, BackgroundTasks
from sqlalchemy.orm import Session

from app.api.deps import require_role, get_current_user
from app.core.security import Role
from app.core.config import settings
from app.core.logging_config import get_logger
from app.db.db_models import get_db, Transaction, AuditLog, ModelVersion, User
from app.models.schema import TransactionInput, PredictionResult, BatchUploadResult, ModelVersionOut
from app.services.model_service import model_service, register_new_version
from app.services.email_service import send_fraud_alert_email
from app.services.websocket_manager import manager

router = APIRouter(tags=["Prediction"])
logger = get_logger(__name__)


def _score_and_store(db: Session, features: list[float], user: User | None,
                      batch_id: str | None = None) -> Transaction:
    if not model_service.is_ready():
        raise HTTPException(
            status_code=503,
            detail="No active fraud detection model is loaded. "
                    "An admin must train and activate a model version first.",
        )

    prob = model_service.predict_proba(np.array(features))
    is_fraud = prob >= 0.5

    txn = Transaction(
        submitted_by_id=user.id if user else None,
        features=features,
        fraud_probability=prob,
        is_fraud_predicted=is_fraud,
        model_version=model_service.version_tag,
        batch_id=batch_id,
    )
    db.add(txn)
    db.commit()
    db.refresh(txn)
    return txn


async def _maybe_alert(db: Session, txn: Transaction, alert_email: str | None):
    """Fires a WebSocket broadcast + email if probability crosses the
    configured high-risk threshold. Best-effort: logged failures never
    fail the parent prediction request."""
    if txn.fraud_probability < settings.FRAUD_ALERT_THRESHOLD:
        return

    alert_payload = {
        "type": "fraud_alert",
        "transaction_id": txn.id,
        "fraud_probability": txn.fraud_probability,
        "model_version": txn.model_version,
        "message": f"High-risk transaction #{txn.id} flagged "
                   f"({txn.fraud_probability:.1%} fraud probability)",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    try:
        await manager.broadcast_json(alert_payload)
    except Exception as e:
        logger.error(f"WebSocket broadcast failed for transaction {txn.id}: {e}")

    if alert_email:
        send_fraud_alert_email(alert_email, txn.id, txn.fraud_probability)


@router.post("/predict", response_model=PredictionResult)
async def predict(
    payload: TransactionInput,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(Role.ADMIN, Role.FRAUD_ANALYST)),
):
    features = [payload.Time] + payload.V + [payload.Amount]
    txn = _score_and_store(db, features, user)

    db.add(AuditLog(
        user_id=user.id, action="PREDICT",
        detail={"transaction_id": txn.id, "probability": txn.fraud_probability},
        ip_address=request.client.host if request.client else None,
    ))
    db.commit()

    await _maybe_alert(db, txn, alert_email=user.email)
    return PredictionResult(
        transaction_id=txn.id,
        fraud_probability=txn.fraud_probability,
        is_fraud_predicted=txn.is_fraud_predicted,
        model_version=txn.model_version,
        created_at=txn.created_at,
    )


@router.post("/predict/batch-csv", response_model=BatchUploadResult)
async def predict_batch_csv(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(require_role(Role.ADMIN, Role.FRAUD_ANALYST)),
):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only .csv files are accepted")

    raw = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(raw))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not parse CSV: {e}")

    required_cols = ["Time"] + [f"V{i}" for i in range(1, 29)] + ["Amount"]
    missing = [c for c in required_cols if c not in df.columns]
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"CSV is missing required columns: {missing}. "
                    f"Expected schema: {required_cols}",
        )

    batch_id = str(uuid.uuid4())
    results: list[PredictionResult] = []
    flagged = 0

    for _, row in df.iterrows():
        features = row[required_cols].astype(float).tolist()
        txn = _score_and_store(db, features, user, batch_id=batch_id)
        if txn.is_fraud_predicted:
            flagged += 1
        await _maybe_alert(db, txn, alert_email=user.email)
        results.append(PredictionResult(
            transaction_id=txn.id,
            fraud_probability=txn.fraud_probability,
            is_fraud_predicted=txn.is_fraud_predicted,
            model_version=txn.model_version,
            created_at=txn.created_at,
        ))

    db.add(AuditLog(
        user_id=user.id, action="CSV_UPLOAD",
        detail={"batch_id": batch_id, "rows": len(df), "flagged": flagged},
        ip_address=request.client.host if request.client else None,
    ))
    db.commit()

    logger.info(f"Batch {batch_id}: {len(df)} rows scored, {flagged} flagged as fraud")

    return BatchUploadResult(
        batch_id=batch_id,
        total_rows=len(df),
        flagged_fraud_count=flagged,
        results=results,
    )


@router.get("/models/versions", response_model=list[ModelVersionOut])
def list_model_versions(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),  # any authenticated role can view
):
    return db.query(ModelVersion).order_by(ModelVersion.created_at.desc()).all()


@router.get("/predict/recent", response_model=list[PredictionResult])
def get_recent_predictions(
    limit: int = 5,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),  # any authenticated role
):
    """
    Powers the Dashboard's "Recent Predictions" widget for every role --
    unlike /audit/transactions (Admin/Auditor only), this is intentionally
    open to Fraud Analysts too, since they otherwise have no way to see
    even their own recent activity on the dashboard.

    Admins and Auditors see recent activity system-wide (oversight view).
    Fraud Analysts see only transactions THEY submitted (their own activity,
    not other analysts' work -- keeps this consistent with least-privilege
    access even for a "recent activity" convenience feature).
    """
    query = db.query(Transaction)
    if user.role not in (Role.ADMIN.value, Role.AUDITOR.value):
        query = query.filter(Transaction.submitted_by_id == user.id)

    transactions = query.order_by(Transaction.created_at.desc()).limit(min(limit, 20)).all()

    return [
        PredictionResult(
            transaction_id=t.id,
            fraud_probability=t.fraud_probability,
            is_fraud_predicted=t.is_fraud_predicted,
            model_version=t.model_version,
            created_at=t.created_at,
        )
        for t in transactions
    ]


@router.post("/models/activate/{version_tag}", response_model=ModelVersionOut)
def activate_model_version(
    version_tag: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(Role.ADMIN)),
):
    version = db.query(ModelVersion).filter(ModelVersion.version_tag == version_tag).first()
    if not version:
        raise HTTPException(status_code=404, detail=f"Model version '{version_tag}' not found")

    db.query(ModelVersion).update({ModelVersion.is_active: False})
    version.is_active = True
    db.commit()
    db.refresh(version)

    model_service.load_active(db)
    logger.info(f"Model version {version_tag} activated by {user.email}")
    return version
