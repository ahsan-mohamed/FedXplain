"""
model_def.py

Defines the model architecture shared by every bank in the federation.
Using scikit-learn's SGDClassifier (logistic regression trained via SGD)
instead of a deep net or XGBoost -- on purpose:

  1. SGDClassifier supports `partial_fit`, meaning we can train it for a
     few local steps, extract its weights, average them (FedAvg), and
     push the averaged weights back in. This is the cleanest way to
     hand-roll FedAvg without needing a full deep learning framework.
  2. It keeps the whole pipeline lightweight and fast to run/demo.
  3. It is a defensible, explainable baseline -- easy to justify in a viva.

You can later swap this for a small PyTorch MLP using the exact same
get_weights/set_weights/train_one_round interface if you want a stronger
model for your final report.
"""

import numpy as np
from sklearn.linear_model import SGDClassifier
from sklearn.preprocessing import StandardScaler

N_FEATURES = 30  # Time + V1..V28 + Amount


def new_model() -> SGDClassifier:
    model = SGDClassifier(
        loss="log_loss",       # logistic regression
        penalty="l2",
        alpha=1e-4,
        max_iter=1,             # we control epochs manually via partial_fit
        learning_rate="optimal",
        random_state=42,
        warm_start=True,
    )
    return model


def initialize_weights(model: SGDClassifier, n_features: int = N_FEATURES):
    """SGDClassifier needs at least one partial_fit call before coef_ exists.
    We do a dummy fit on synthetic balanced data just to initialize shapes,
    then immediately overwrite with zeros so every bank starts identically."""
    X_dummy = np.random.randn(4, n_features)
    y_dummy = np.array([0, 1, 0, 1])
    model.partial_fit(X_dummy, y_dummy, classes=np.array([0, 1]))
    model.coef_ = np.zeros_like(model.coef_)
    model.intercept_ = np.zeros_like(model.intercept_)
    return model


def get_weights(model: SGDClassifier) -> dict:
    return {"coef": model.coef_.copy(), "intercept": model.intercept_.copy()}


def set_weights(model: SGDClassifier, weights: dict) -> SGDClassifier:
    model.coef_ = weights["coef"].copy()
    model.intercept_ = weights["intercept"].copy()
    model.classes_ = np.array([0, 1])
    return model


def fedavg(weight_list: list[dict], sample_counts: list[int]) -> dict:
    """
    Federated Averaging (McMahan et al., 2017): weighted average of each
    bank's model weights, weighted by how many local samples that bank
    trained on. Banks with more data influence the global model more --
    this is standard FedAvg, not a simplification.
    """
    total = sum(sample_counts)
    avg_coef = sum(w["coef"] * n for w, n in zip(weight_list, sample_counts)) / total
    avg_intercept = sum(w["intercept"] * n for w, n in zip(weight_list, sample_counts)) / total
    return {"coef": avg_coef, "intercept": avg_intercept}
