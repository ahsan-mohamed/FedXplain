"""
partition_data.py

Splits the raw dataset across N simulated "banks" for federated learning.

Supports two modes:
  - iid:     each bank gets a random, similarly-distributed slice (baseline)
  - non_iid: each bank gets a skewed slice -- e.g. Bank A sees more high-amount
             fraud, Bank B sees more low-amount "test charge" fraud, etc.
             This is more realistic: different banks' customers genuinely have
             different transaction profiles and fraud exposure.

This directly matters for your evaluation section -- FedAvg with non-IID data
is a well-known harder case in the FL literature, so demonstrating your model
still performs reasonably here is a stronger result than testing on IID splits.
"""

import numpy as np
import pandas as pd
from pathlib import Path

RAW_PATH = Path(__file__).parent.parent / "data" / "raw" / "creditcard.csv"
OUT_DIR = Path(__file__).parent.parent / "data" / "partitioned"
OUT_DIR.mkdir(parents=True, exist_ok=True)


def partition_iid(df: pd.DataFrame, n_banks: int, seed: int = 42) -> list[pd.DataFrame]:
    df = df.sample(frac=1, random_state=seed).reset_index(drop=True)
    idx_splits = np.array_split(np.arange(len(df)), n_banks)
    return [df.iloc[idx].reset_index(drop=True) for idx in idx_splits]


def partition_non_iid(df: pd.DataFrame, n_banks: int, seed: int = 42) -> list[pd.DataFrame]:
    """
    Skews the split using the Amount field as a proxy for "customer profile":
    sort by Amount, then chunk -- so each bank ends up with a different
    dominant transaction-size profile (mimicking e.g. a retail bank vs.
    a business/corporate bank vs. a regional credit union).
    Fraud examples are then distributed so no bank is left with zero fraud
    (that would make FL training degenerate), but the *ratio* differs per bank.
    """
    rng = np.random.default_rng(seed)
    legit = df[df["Class"] == 0].sort_values("Amount").reset_index(drop=True)
    fraud = df[df["Class"] == 1].sample(frac=1, random_state=seed).reset_index(drop=True)

    legit_idx_splits = np.array_split(np.arange(len(legit)), n_banks)
    legit_chunks = [legit.iloc[idx].reset_index(drop=True) for idx in legit_idx_splits]

    # Distribute fraud unevenly across banks using a Dirichlet distribution
    # (standard technique in FL research for simulating non-IID label skew)
    proportions = rng.dirichlet(alpha=[1.5] * n_banks)
    proportions = np.clip(proportions, 0.05, None)  # ensure every bank gets some fraud
    proportions = proportions / proportions.sum()
    fraud_counts = (proportions * len(fraud)).astype(int)
    fraud_counts[-1] = len(fraud) - fraud_counts[:-1].sum()  # fix rounding

    fraud_chunks = []
    idx = 0
    for count in fraud_counts:
        fraud_chunks.append(fraud.iloc[idx: idx + count])
        idx += count

    banks = [
        pd.concat([legit_chunks[i], fraud_chunks[i]]).sample(frac=1, random_state=seed).reset_index(drop=True)
        for i in range(n_banks)
    ]
    return banks


def run(n_banks: int = 5, mode: str = "non_iid", seed: int = 42):
    df = pd.read_csv(RAW_PATH)
    banks = partition_non_iid(df, n_banks, seed) if mode == "non_iid" else partition_iid(df, n_banks, seed)

    for i, bank_df in enumerate(banks, start=1):
        path = OUT_DIR / f"bank_{i}.csv"
        bank_df.to_csv(path, index=False)
        fraud_pct = bank_df["Class"].mean() * 100
        print(f"Bank {i}: {len(bank_df)} rows | fraud rate {fraud_pct:.3f}% | "
              f"avg amount {bank_df['Amount'].mean():.2f}")

    print(f"\nPartitioned into {n_banks} banks ({mode}) -> {OUT_DIR}")


if __name__ == "__main__":
    run(n_banks=5, mode="non_iid")
