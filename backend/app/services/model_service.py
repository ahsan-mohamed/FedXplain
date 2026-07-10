"""
model_service.py

Loads the trained models and exposes clean predict() functions.

Two engines are supported:
  - XGBoostEngine: the production real-time scoring engine (higher
    accuracy, native SHAP support via TreeExplainer). This is what
    /predict actually serves by default.
  - FederatedEngine: the FedAvg-trained logistic regression from
    federated/train_federated.py -- kept available via
    /predict/federated for side-by-side comparison in your report,
    since it's the privacy-preserving research contribution.

Also implements simple file-based model versioning for the XGBoost
engine: every trained model gets copied into models_store/versions/<tag>/
with its metrics, and a ModelVersion DB row tracks which one is
currently "active".
"""

import pickle
from pathlib import Path

import numpy as np
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.logging_config import get_logger
from app.db.db_models import ModelVersion

logger = get_logger(__name__)

MODEL_STORE = Path(settings.MODEL_STORE_DIR)
VERSIONS_DIR = MODEL_STORE / "versions"
VERSIONS_DIR.mkdir(parents=True, exist_ok=True)


class ModelService:
    """Holds the currently active XGBoost model (primary serving engine)
    plus the federated logistic-regression model (secondary, for
    comparison). Call load_active() at app startup and after every
    register_new_version()."""

    def __init__(self):
        # XGBoost (primary)
        self.xgb_model = None
        self.xgb_scaler = None
        self.feature_names = None
        self.version_tag = None

        # Federated logistic regression (secondary / comparison)
        self.fed_weights = None
        self.fed_scaler_mean = None
        self.fed_scaler_scale = None

    def load_active(self, db: Session):
        active = db.query(ModelVersion).filter(ModelVersion.is_active.is_(True)).first()
        if active is None:
            logger.warning("No active model version found in DB. Predictions will fail "
                            "until a model is registered and activated.")
            return

        with open(active.file_path, "rb") as f:
            payload = pickle.load(f)

        self.xgb_model = payload["model"]
        self.xgb_scaler = payload["scaler"]
        self.feature_names = payload["feature_names"]
        self.version_tag = active.version_tag
        logger.info(f"Loaded active XGBoost model version: {self.version_tag}")

    def load_federated_comparison_model(self):
        """Loads the federated model artifacts directly from disk (not
        versioned through the DB -- it's a fixed research comparison
        point, not something an admin swaps in production)."""
        global_model_path = MODEL_STORE / "global_model.pkl"
        scalers_path = MODEL_STORE / "bank_scalers.pkl"
        if not global_model_path.exists() or not scalers_path.exists():
            logger.warning("Federated comparison model artifacts not found. "
                            "Run federated/train_federated.py to enable /predict/federated.")
            return

        with open(global_model_path, "rb") as f:
            self.fed_weights = pickle.load(f)
        with open(scalers_path, "rb") as f:
            bank_scalers = pickle.load(f)

        self.fed_scaler_mean = np.mean([s.mean_ for s in bank_scalers.values()], axis=0)
        self.fed_scaler_scale = np.mean([s.scale_ for s in bank_scalers.values()], axis=0)
        logger.info("Loaded federated comparison model")

    def is_ready(self) -> bool:
        return self.xgb_model is not None

    def is_federated_ready(self) -> bool:
        return self.fed_weights is not None

    def predict_proba(self, features: np.ndarray) -> float:
        """Primary serving prediction: XGBoost."""
        if not self.is_ready():
            raise RuntimeError("No active model loaded. Register and activate a model version first.")
        scaled = self.xgb_scaler.transform(features.reshape(1, -1))
        return float(self.xgb_model.predict_proba(scaled)[0, 1])

    def predict_proba_federated(self, features: np.ndarray) -> float:
        """Secondary/comparison prediction: federated logistic regression."""
        if not self.is_federated_ready():
            raise RuntimeError("Federated comparison model not loaded.")
        scaled = (features - self.fed_scaler_mean) / self.fed_scaler_scale
        z = np.dot(scaled, self.fed_weights["coef"][0]) + self.fed_weights["intercept"][0]
        return float(1.0 / (1.0 + np.exp(-z)))


model_service = ModelService()


def register_new_version(db: Session, xgb_payload: dict, activate: bool = True) -> ModelVersion:
    """Called after evaluation/train_xgboost.py completes. Saves the model
    artifact under a new version tag and, by default, makes it the active
    model that serves live predictions.

    xgb_payload must contain: model, scaler, feature_names, metrics
    (exactly what train_xgboost.py pickles)."""
    existing_count = db.query(ModelVersion).count()
    version_tag = f"v1.{existing_count}.0"

    version_dir = VERSIONS_DIR / version_tag
    version_dir.mkdir(parents=True, exist_ok=True)
    file_path = version_dir / "model.pkl"

    with open(file_path, "wb") as f:
        pickle.dump(xgb_payload, f)

    if activate:
        db.query(ModelVersion).update({ModelVersion.is_active: False})

    version = ModelVersion(
        version_tag=version_tag,
        file_path=str(file_path),
        metrics=xgb_payload.get("metrics", {}),
        is_active=activate,
    )
    db.add(version)
    db.commit()
    db.refresh(version)

    logger.info(f"Registered new model version {version_tag} (active={activate})")
    return version
