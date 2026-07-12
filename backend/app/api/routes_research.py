"""
routes_research.py

GET /research/comparison — exposes the actual experiment results comparing
three approaches, so the core research contribution of this project (not
just "we built a fraud model" but "federated learning approaches centralized
performance without sharing raw data") is visible in the product itself,
not just buried in training logs.

Reads directly from the JSON/pickle artifacts already produced by:
  - federated/train_federated.py       -> training_history.json
  - evaluation/train_xgboost.py         -> xgboost_metrics.json
  - evaluation/baseline_single_bank.py  -> baseline_single_bank_results.json
  - evaluation/baseline_centralized.py  -> baseline_centralized_results.json

Any file that doesn't exist yet (e.g. baselines never run in this
environment) is simply omitted from the response rather than erroring --
the frontend renders whatever is actually available.
"""

import json
from pathlib import Path

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.db.db_models import get_db, User

router = APIRouter(prefix="/research", tags=["Research"])

MODELS_DIR = Path(settings.MODEL_STORE_DIR)


def _read_json(path: Path):
    if not path.exists():
        return None
    with open(path) as f:
        return json.load(f)


@router.get("/comparison")
def get_research_comparison(user: User = Depends(get_current_user)):
    federated_history = _read_json(MODELS_DIR / "training_history.json")
    federated_final = federated_history[-1] if federated_history else None

    xgboost_metrics = _read_json(MODELS_DIR / "xgboost_metrics.json")
    single_bank = _read_json(MODELS_DIR / "baseline_single_bank_results.json")
    centralized = _read_json(MODELS_DIR / "baseline_centralized_results.json")

    single_bank_avg = single_bank.get("_average") if single_bank else None

    approaches = []

    if federated_final:
        approaches.append({
            "name": "Federated Learning",
            "description": "5 banks, FedAvg, no raw data shared",
            "accuracy": federated_final.get("avg_accuracy"),
            "f1": federated_final.get("avg_f1"),
            "auc": federated_final.get("avg_auc"),
            "privacy_preserving": True,
        })

    if single_bank_avg:
        approaches.append({
            "name": "Isolated Single-Bank",
            "description": "Each bank trains alone (today's status quo)",
            "accuracy": single_bank_avg.get("accuracy"),
            "f1": single_bank_avg.get("f1"),
            "auc": single_bank_avg.get("auc"),
            "privacy_preserving": True,
        })

    if centralized:
        approaches.append({
            "name": "Centralized (Pooled)",
            "description": "All raw data pooled together (privacy-violating upper bound)",
            "accuracy": centralized.get("accuracy"),
            "f1": centralized.get("f1"),
            "auc": centralized.get("auc"),
            "privacy_preserving": False,
        })

    if xgboost_metrics:
        approaches.append({
            "name": "XGBoost (Production)",
            "description": "Centrally-trained production scoring engine",
            "accuracy": xgboost_metrics.get("accuracy"),
            "f1": xgboost_metrics.get("f1"),
            "auc": xgboost_metrics.get("auc"),
            "privacy_preserving": False,
        })

    return {
        "approaches": approaches,
        "federated_rounds": len(federated_history) if federated_history else 0,
    }
