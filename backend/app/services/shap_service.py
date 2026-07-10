"""
shap_service.py

Computes SHAP (SHapley Additive exPlanations) values for a single
transaction against the active XGBoost model. Uses TreeExplainer, which
is exact and fast for tree ensembles (unlike KernelExplainer, which is
a slow model-agnostic approximation needed for non-tree models).

Returns the top-K features driving the prediction, in a structure that's
easy to both render on a chart (frontend) and feed into the LLM narrative
generator (services/llm_service.py) as plain structured input.
"""

import pickle
from pathlib import Path

import numpy as np
import shap

from app.core.config import settings
from app.core.logging_config import get_logger

logger = get_logger(__name__)

MODELS_DIR = Path(settings.MODEL_STORE_DIR)


class ShapService:
    def __init__(self):
        self.model = None
        self.scaler = None
        self.feature_names: list[str] | None = None
        self.explainer: shap.TreeExplainer | None = None

    def load(self):
        path = MODELS_DIR / "xgboost_model.pkl"
        if not path.exists():
            logger.warning(
                f"No XGBoost model found at {path}. Run evaluation/train_xgboost.py first. "
                "SHAP explanations will be unavailable until then."
            )
            return

        with open(path, "rb") as f:
            payload = pickle.load(f)

        self.model = payload["model"]
        self.scaler = payload["scaler"]
        self.feature_names = payload["feature_names"]
        self.explainer = shap.TreeExplainer(self.model)
        logger.info(f"SHAP TreeExplainer ready for {len(self.feature_names)} features")

    def is_ready(self) -> bool:
        return self.explainer is not None

    def predict_proba(self, raw_features: np.ndarray) -> float:
        scaled = self.scaler.transform(raw_features.reshape(1, -1))
        return float(self.model.predict_proba(scaled)[0, 1])

    def explain(self, raw_features: np.ndarray, top_k: int = 5) -> dict:
        """
        raw_features: 1D array, unscaled, in the exact order of
        self.feature_names (Time, V1..V28, Amount).

        Returns:
            {
              "fraud_probability": float,
              "base_value": float,          # model's average prediction (log-odds space)
              "shap_values": {feature: value, ...},   # every feature's contribution
              "top_features": [              # sorted by |impact|, for display/LLM
                  {"feature": "V14", "shap_value": -2.31, "feature_value": -5.2, "direction": "toward_fraud"},
                  ...
              ]
            }
        """
        if not self.is_ready():
            raise RuntimeError("SHAP explainer not loaded. Train the XGBoost model first.")

        scaled = self.scaler.transform(raw_features.reshape(1, -1))
        shap_values = self.explainer.shap_values(scaled)[0]  # 1D array, one value per feature
        base_value = float(self.explainer.expected_value)

        prob = self.predict_proba(raw_features)

        feature_impacts = []
        for name, shap_val, feat_val in zip(self.feature_names, shap_values, raw_features):
            feature_impacts.append({
                "feature": name,
                "shap_value": float(shap_val),
                "feature_value": float(feat_val),
                "direction": "toward_fraud" if shap_val > 0 else "toward_legitimate",
            })

        # Sort by absolute impact, descending
        top_features = sorted(feature_impacts, key=lambda x: abs(x["shap_value"]), reverse=True)[:top_k]

        return {
            "fraud_probability": prob,
            "base_value": base_value,
            "shap_values": {f["feature"]: f["shap_value"] for f in feature_impacts},
            "top_features": top_features,
        }


shap_service = ShapService()
