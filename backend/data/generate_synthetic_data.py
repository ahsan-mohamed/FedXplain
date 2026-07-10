"""
generate_synthetic_data.py

Generates a synthetic dataset with the SAME SCHEMA as the real Kaggle
"Credit Card Fraud Detection" dataset (Time, V1..V28, Amount, Class),
so this pipeline is a drop-in replacement: once you download the real
creditcard.csv, just place it in data/raw/creditcard.csv and everything
downstream (partitioning, FL training, SHAP, LLM) works unchanged.

Why synthetic for now: no network access to Kaggle in this dev sandbox.
Swap this out for real data before your final report / demo.
"""

import numpy as np
import pandas as pd
from sklearn.datasets import make_classification
from pathlib import Path

RAW_DIR = Path(__file__).parent / "raw"
RAW_DIR.mkdir(parents=True, exist_ok=True)

def generate(n_samples: int = 20000, fraud_ratio: float = 0.017, seed: int = 42) -> pd.DataFrame:
    """
    Creates a heavily imbalanced binary classification dataset that mimics
    the real dataset's structure: 28 anonymized PCA-like features (V1-V28),
    a Time column, an Amount column, and a binary Class label.
    Real dataset's fraud ratio is ~0.17% (492 fraud / 284,807 total) -- we
    default close to that so class imbalance challenges are realistic.
    """
    n_fraud = int(n_samples * fraud_ratio)
    n_legit = n_samples - n_fraud

    X, y = make_classification(
        n_samples=n_samples,
        n_features=28,
        n_informative=15,
        n_redundant=5,
        n_clusters_per_class=3,
        weights=[1 - fraud_ratio, fraud_ratio],
        flip_y=0.001,
        class_sep=1.2,
        random_state=seed,
    )

    rng = np.random.default_rng(seed)
    df = pd.DataFrame(X, columns=[f"V{i}" for i in range(1, 29)])

    # Time: seconds elapsed, spread across ~2 days like the real dataset
    df["Time"] = np.sort(rng.uniform(0, 172800, size=n_samples))

    # Amount: legit transactions cluster lower/mid, fraud transactions
    # skew toward a bimodal pattern (very small "test" charges or large)
    amount = rng.lognormal(mean=3.0, sigma=1.3, size=n_samples)
    fraud_mask = y == 1
    amount[fraud_mask] *= rng.choice([0.1, 3.5], size=fraud_mask.sum(), p=[0.4, 0.6])
    df["Amount"] = np.round(amount, 2)

    df["Class"] = y

    # Reorder columns to match real dataset: Time, V1..V28, Amount, Class
    cols = ["Time"] + [f"V{i}" for i in range(1, 29)] + ["Amount", "Class"]
    df = df[cols]
    return df.sample(frac=1, random_state=seed).reset_index(drop=True)


if __name__ == "__main__":
    df = generate()
    out_path = RAW_DIR / "creditcard.csv"
    df.to_csv(out_path, index=False)
    print(f"Generated {len(df)} rows ({df['Class'].sum()} fraud, "
          f"{df['Class'].sum()/len(df)*100:.3f}% fraud rate)")
    print(f"Saved to {out_path}")
