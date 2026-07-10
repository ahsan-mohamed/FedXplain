"""
bootstrap_model.py

Run this AFTER evaluation/train_xgboost.py to register the trained
XGBoost model into the app's model versioning system and DB, marking
it active so /predict starts working immediately with the production
scoring engine.

    PYTHONPATH=. python3 app/bootstrap_model.py
"""

import pickle
from pathlib import Path

from app.db.db_models import init_db, SessionLocal
from app.services.model_service import register_new_version

MODELS_DIR = Path(__file__).parent.parent / "models_store"


def main():
    init_db()

    xgb_model_path = MODELS_DIR / "xgboost_model.pkl"
    if not xgb_model_path.exists():
        raise FileNotFoundError(
            "No trained XGBoost model found. Run evaluation/train_xgboost.py first."
        )

    with open(xgb_model_path, "rb") as f:
        xgb_payload = pickle.load(f)

    db = SessionLocal()
    try:
        version = register_new_version(db, xgb_payload, activate=True)
        print(f"Registered and activated model version: {version.version_tag}")
        print(f"Metrics: {xgb_payload.get('metrics', {})}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
