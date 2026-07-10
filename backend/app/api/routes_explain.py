"""
routes_explain.py

- GET /explain/{transaction_id}         : SHAP + plain-English LLM narrative
- GET /explain/{transaction_id}/basel   : SHAP + Basel III-style audit narrative
- POST /predict/explained               : predict AND explain in one call
                                            (what the analyst dashboard uses)

Explanations are computed on-demand and cached in the Explanation table --
if you ask for the same transaction's explanation twice, the second call
is instant (no repeat SHAP/LLM computation).
"""

import numpy as np
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import require_role, get_current_user
from app.core.security import Role
from app.core.logging_config import get_logger
from app.db.db_models import get_db, Transaction, Explanation, User
from app.models.schema import ExplanationOut, TransactionInput, PredictionResult
from app.services.shap_service import shap_service
from app.services.llm_service import plain_narrative, basel_audit_narrative
from app.services.websocket_manager import manager
from app.services.email_service import send_fraud_alert_email
from app.core.config import settings
from datetime import datetime, timezone

router = APIRouter(tags=["Explainability"])
logger = get_logger(__name__)


def _get_or_compute_explanation(db: Session, txn: Transaction, mode: str = "plain") -> Explanation:
    """Caches SHAP values once per transaction, but computes/stores the
    plain and Basel III narratives SEPARATELY -- they're different prompts
    and different audiences, so one must never be served in place of the
    other. Each is only (re)computed the first time it's actually asked for."""
    narrative_field = "llm_narrative" if mode == "plain" else "llm_narrative_basel"

    existing = db.query(Explanation).filter(Explanation.transaction_id == txn.id).first()
    if existing and getattr(existing, narrative_field):
        return existing

    if not shap_service.is_ready():
        raise HTTPException(
            status_code=503,
            detail="SHAP explainer not ready. Run evaluation/train_xgboost.py first.",
        )

    features = np.array(txn.features)
    # Reuse cached SHAP values if we already computed them for the other
    # mode -- SHAP itself doesn't depend on mode, only the narrative does.
    if existing:
        shap_result = {
            "fraud_probability": txn.fraud_probability,
            "top_features": existing.top_features,
        }
    else:
        shap_result = shap_service.explain(features, top_k=5)

    narrative = basel_audit_narrative(shap_result, txn.id) if mode == "basel" else plain_narrative(shap_result)

    if existing:
        setattr(existing, narrative_field, narrative)
        db.commit()
        db.refresh(existing)
        return existing

    explanation = Explanation(
        transaction_id=txn.id,
        shap_values=shap_result["shap_values"],
        top_features=shap_result["top_features"],
        **{narrative_field: narrative},
    )
    db.add(explanation)
    db.commit()
    db.refresh(explanation)
    return explanation


@router.get("/explain/{transaction_id}", response_model=ExplanationOut)
def explain_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),  # any authenticated role can read
):
    txn = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")

    explanation = _get_or_compute_explanation(db, txn, mode="plain")
    return ExplanationOut(
        transaction_id=txn.id,
        top_features=explanation.top_features,
        llm_narrative=explanation.llm_narrative,
        created_at=explanation.created_at,
    )


@router.get("/explain/{transaction_id}/basel", response_model=ExplanationOut)
def explain_transaction_basel(
    transaction_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(Role.ADMIN, Role.FRAUD_ANALYST, Role.AUDITOR)),
):
    """Formal Basel III-style audit narrative -- intended for auditors and
    compliance reporting, not casual dashboard browsing."""
    txn = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")

    explanation = _get_or_compute_explanation(db, txn, mode="basel")
    return ExplanationOut(
        transaction_id=txn.id,
        top_features=explanation.top_features,
        llm_narrative=explanation.llm_narrative_basel,
        created_at=explanation.created_at,
    )


@router.post("/predict/explained")
async def predict_and_explain(
    payload: TransactionInput,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(Role.ADMIN, Role.FRAUD_ANALYST)),
):
    """Single call that scores a transaction AND returns its explanation --
    what the analyst dashboard calls so the UI doesn't need two round trips."""
    from app.services.model_service import model_service

    if not model_service.is_ready():
        raise HTTPException(status_code=503, detail="No active model loaded.")

    features = [payload.Time] + payload.V + [payload.Amount]
    prob = model_service.predict_proba(np.array(features))
    is_fraud = prob >= 0.5

    txn = Transaction(
        submitted_by_id=user.id,
        features=features,
        fraud_probability=prob,
        is_fraud_predicted=is_fraud,
        model_version=model_service.version_tag,
    )
    db.add(txn)
    db.commit()
    db.refresh(txn)

    explanation = _get_or_compute_explanation(db, txn, mode="plain")

    if prob >= settings.FRAUD_ALERT_THRESHOLD:
        try:
            await manager.broadcast_json({
                "type": "fraud_alert",
                "transaction_id": txn.id,
                "fraud_probability": prob,
                "message": f"High-risk transaction #{txn.id} flagged ({prob:.1%})",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })
        except Exception as e:
            logger.error(f"WebSocket broadcast failed: {e}")
        send_fraud_alert_email(user.email, txn.id, prob)

    return {
        "transaction_id": txn.id,
        "fraud_probability": prob,
        "is_fraud_predicted": is_fraud,
        "model_version": txn.model_version,
        "top_features": explanation.top_features,
        "llm_narrative": explanation.llm_narrative,
    }
