"""
baseline_single_bank.py

Baseline #1: what if each bank just trained its OWN model, alone, with
no federation at all? This is the "before" picture -- the real-world
status quo the paper's intro describes (isolated institutions, weaker
models). Your federated model should outperform the AVERAGE of these.
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
OUT_PATH = Path(__file__).parent.parent / "models_store" / "baseline_single_bank_results.json"


def train_and_eval_single_bank(csv_path: str, epochs: int = 45,
                                test_size: float = 0.2, seed: int = 42) -> dict:
    """Trains a model using ONLY this bank's data, for the same total number
    of gradient steps as the federated model got across all rounds (rounds x
    local_epochs), so the comparison is apples-to-apples on compute budget.
    Evaluated on a held-out split of THIS bank's own data -- same protocol
    as the federated client's evaluate(), so the comparison is fair."""
    df = pd.read_csv(csv_path)
    X_all = df.drop(columns=["Class"]).values
    y_all = df["Class"].values

    X_train, X_test, y_train, y_test = train_test_split(
        X_all, y_all, test_size=test_size, random_state=seed, stratify=y_all
    )

    scaler = StandardScaler().fit(X_train)
    X_train = scaler.transform(X_train)
    X_test = scaler.transform(X_test)

    model = SGDClassifier(loss="log_loss", penalty="l2", alpha=1e-4,
                           random_state=42, warm_start=True)
    for _ in range(epochs):
        model.partial_fit(X_train, y_train, classes=np.array([0, 1]))

    preds = model.predict(X_test)
    probs = model.predict_proba(X_test)[:, 1]
    return {
        "accuracy": accuracy_score(y_test, preds),
        "f1": f1_score(y_test, preds, zero_division=0),
        "auc": roc_auc_score(y_test, probs) if len(set(y_test)) > 1 else float("nan"),
        "n_samples": len(y_test),
    }


def main():
    bank_files = sorted(PARTITION_DIR.glob("bank_*.csv"))
    results = {}
    for path in bank_files:
        bank_name = path.stem
        metrics = train_and_eval_single_bank(str(path))
        results[bank_name] = metrics
        print(f"{bank_name} (isolated): acc={metrics['accuracy']:.4f} "
              f"f1={metrics['f1']:.4f} auc={metrics['auc']:.4f}")

    avg_f1 = np.mean([r["f1"] for r in results.values()])
    avg_auc = np.nanmean([r["auc"] for r in results.values()])
    avg_acc = np.mean([r["accuracy"] for r in results.values()])
    results["_average"] = {"accuracy": avg_acc, "f1": avg_f1, "auc": avg_auc}
    print(f"\nAverage across isolated banks: acc={avg_acc:.4f} f1={avg_f1:.4f} auc={avg_auc:.4f}")

    with open(OUT_PATH, "w") as f:
        json.dump(results, f, indent=2, default=float)
    print(f"Saved -> {OUT_PATH}")


if __name__ == "__main__":
    main()
