"""
routes_audit.py

- GET /audit/logs        : view audit trail (Auditor, Admin) -- read-only,
                            supports the paper's "Accountability" and
                            "Regulatory Compliance" requirements directly.
- GET /audit/transactions : view all scored transactions with explanations
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import require_role
from app.core.security import Role
from app.db.db_models import get_db, AuditLog, Transaction

router = APIRouter(prefix="/audit", tags=["Audit & Compliance"])


@router.get("/logs")
def get_audit_logs(
    limit: int = Query(default=100, le=1000),
    offset: int = 0,
    db: Session = Depends(get_db),
    user=Depends(require_role(Role.AUDITOR, Role.ADMIN)),
):
    logs = (
        db.query(AuditLog)
        .order_by(AuditLog.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return logs


@router.get("/transactions")
def get_all_transactions(
    limit: int = Query(default=100, le=1000),
    offset: int = 0,
    only_fraud: bool = False,
    db: Session = Depends(get_db),
    user=Depends(require_role(Role.AUDITOR, Role.ADMIN)),
):
    query = db.query(Transaction)
    if only_fraud:
        query = query.filter(Transaction.is_fraud_predicted.is_(True))
    return (
        query.order_by(Transaction.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
