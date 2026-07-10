"""
train_xgboost.py

Trains an XGBoost classifier on the combined (pooled) partitioned bank
data. This is deliberately a SEPARATE, CENTRALIZED model from the
federated logistic regression in federated/train_federated.py -- and
that's an intentional architecture choice, not a contradiction:

  - The FEDERATED model (federated/) is your privacy-preserving research
    contribution -- it proves banks can collaborate without sharing raw
    data, which is the actual gap this project addresses in the literature.
  - XGBoost here is the STRONGER, PRODUCTION-GRADE scoring engine -- tree
    ensembles substantially outperform linear models on tabular fraud data
    (this is well established in the literature you're citing -- Table 1
    of your source paper shows Random Forest/boosting dominating).

In your report, frame this honestly: "the federated component demonstrates
privacy-preserving collaborative learning is viable; the production
scoring engine uses XGBoost trained centrally by [your institution/a
trusted aggregator], since federating tree ensembles (e.g. via secure
aggregation of histograms) is a harder, actively-researched problem
outside this project's scope." That's a defensible, honest scope
statement for a viva question about "why two models."

XGBoost also gets you native SHAP support (TreeExplainer is fast and
exact, unlike KernelExplainer needed for linear/generic models), which
is why the explainability layer specifically targets this model.
"""

import json
import pickle
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, f1_score, roc_auc_score, precision_score, recall_score
import xgboost as xgb

PARTITION_DIR = Path(__file__).parent.parent / "data" / "partitioned"
MODELS_DIR = Path(__file__).parent.parent / "models_store"
MODELS_DIR.mkdir(parents=True, exist_ok=True)


def main(test_size: float = 0.2, seed: int = 42):
    bank_files = sorted(PARTITION_DIR.glob("bank_*.csv"))
    if not bank_files:
        raise FileNotFoundError("No partitioned bank data found. Run federated/partition_data.py first.")

    df = pd.concat([pd.read_csv(p) for p in bank_files], ignore_index=True)
    feature_cols = ["Time"] + [f"V{i}" for i in range(1, 29)] + ["Amount"]

    X = df[feature_cols].values
    y = df["Class"].values

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, random_state=seed, stratify=y
    )

    # XGBoost handles feature scaling less sensitively than linear models,
    # but we still scale for consistency with the federated model's pipeline
    # and so the SHAP feature contributions are on a comparable footing.
    scaler = StandardScaler().fit(X_train)
    X_train_scaled = scaler.transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # scale_pos_weight compensates for severe class imbalance (typical
    # fraud ratio ~1-2%) -- without this, XGBoost tends to just predict
    # "not fraud" for everything and still get high accuracy.
    pos_weight = (y_train == 0).sum() / max((y_train == 1).sum(), 1)

    model = xgb.XGBClassifier(
        n_estimators=200,
        max_depth=5,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        scale_pos_weight=pos_weight,
        eval_metric="aucpr",
        random_state=seed,
        n_jobs=-1,
    )
    model.fit(X_train_scaled, y_train)

    preds = model.predict(X_test_scaled)
    probs = model.predict_proba(X_test_scaled)[:, 1]

    metrics = {
        "accuracy": accuracy_score(y_test, preds),
        "precision": precision_score(y_test, preds, zero_division=0),
        "recall": recall_score(y_test, preds, zero_division=0),
        "f1": f1_score(y_test, preds, zero_division=0),
        "auc": roc_auc_score(y_test, probs),
        "n_train": len(y_train),
        "n_test": len(y_test),
    }

    print("XGBoost (centralized, pooled data, held-out test set):")
    for k, v in metrics.items():
        print(f"  {k}: {v:.4f}" if isinstance(v, float) else f"  {k}: {v}")

    # Save model + scaler + feature names together -- everything the
    # explainability layer and serving layer need to reconstruct predictions
    with open(MODELS_DIR / "xgboost_model.pkl", "wb") as f:
        pickle.dump({
            "model": model,
            "scaler": scaler,
            "feature_names": feature_cols,
            "metrics": metrics,
        }, f)

    with open(MODELS_DIR / "xgboost_metrics.json", "w") as f:
        json.dump(metrics, f, indent=2, default=float)

    print(f"\nSaved -> {MODELS_DIR / 'xgboost_model.pkl'}")


if __name__ == "__main__":
    main()
