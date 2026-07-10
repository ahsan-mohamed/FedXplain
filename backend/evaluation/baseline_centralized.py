"""
baseline_centralized.py

Baseline #2: what if all banks just pooled their raw data into one place
and trained a single model on everything? This is the "upper bound" --
usually the best possible accuracy, since the model sees all the data
with no restrictions. But it requires banks to share raw customer data,
which is unrealistic/illegal in practice (GDPR, banking secrecy laws,
competitive concerns -- exactly the motivation section of your report).

Your federated model's goal isn't to beat this -- it's to get CLOSE to
this accuracy while never sharing raw data. The gap between federated
and centralized is the "cost of privacy," and reporting it honestly is
good science.
"""

import json
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import SGDClassifier
from sklearn.metrics import accuracy_score, f1_score, roc_auc_score
from sklearn.model_selection import train_test_split

PARTITION_DIR = Path(__file__).parent.parent / "data" / "partitioned"
OUT_PATH = Path(__file__).parent.parent / "models_store" / "baseline_centralized_results.json"


def main(epochs: int = 45, test_size: float = 0.2, seed: int = 42):
    bank_files = sorted(PARTITION_DIR.glob("bank_*.csv"))
    df = pd.concat([pd.read_csv(p) for p in bank_files], ignore_index=True)

    X = df.drop(columns=["Class"]).values
    y = df["Class"].values

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, random_state=seed, stratify=y
    )

    scaler = StandardScaler().fit(X_train)
    X_train = scaler.transform(X_train)
    X_test = scaler.transform(X_test)

    model = SGDClassifier(loss="log_loss", penalty="l2", alpha=1e-4,
                           random_state=seed, warm_start=True)
    for _ in range(epochs):
        model.partial_fit(X_train, y_train, classes=np.array([0, 1]))

    preds = model.predict(X_test)
    probs = model.predict_proba(X_test)[:, 1]

    results = {
        "accuracy": accuracy_score(y_test, preds),
        "f1": f1_score(y_test, preds, zero_division=0),
        "auc": roc_auc_score(y_test, probs),
        "n_train": len(y_train),
        "n_test": len(y_test),
    }

    print("Centralized (pooled data, held-out test set):")
    print(f"  acc={results['accuracy']:.4f} f1={results['f1']:.4f} auc={results['auc']:.4f}")

    with open(OUT_PATH, "w") as f:
        json.dump(results, f, indent=2, default=float)
    print(f"Saved -> {OUT_PATH}")


if __name__ == "__main__":
    main()
