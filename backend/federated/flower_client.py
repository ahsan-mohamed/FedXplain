"""
flower_client.py

Represents ONE simulated bank in the federation. Despite the filename
(kept for parity with the folder structure plan), this is currently a
plain Python class rather than an actual Flower `NumPyClient` -- see the
note in train_federated.py for why, and how to upgrade to real Flower
networking later.

Each BankClient:
  1. Loads only ITS OWN partition of data (never sees other banks' data).
  2. Scales its local features (fit locally -- another realistic touch,
     since each bank's data distribution differs).
  3. Trains for a few local epochs starting from the current global weights.
  4. Returns its updated weights + how many samples it trained on (for FedAvg).
"""

import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split

from federated.model_def import new_model, set_weights, get_weights, initialize_weights


class BankClient:
    def __init__(self, bank_id: int, csv_path: str, local_epochs: int = 3,
                 test_size: float = 0.2, seed: int = 42):
        """
        Each bank holds out its own test_size fraction as a local held-out
        test set (stratified, so both classes are represented). Only the
        training split is ever used for local training; evaluate() below
        always scores on the held-out split, so every reported metric is a
        genuine generalization test, not an in-sample number.
        """
        self.bank_id = bank_id
        self.local_epochs = local_epochs
        df = pd.read_csv(csv_path)

        X_all = df.drop(columns=["Class"]).values
        y_all = df["Class"].values

        X_train, X_test, y_train, y_test = train_test_split(
            X_all, y_all, test_size=test_size, random_state=seed, stratify=y_all
        )

        self.scaler = StandardScaler().fit(X_train)
        self.X = self.scaler.transform(X_train)
        self.y = y_train
        self.X_test = self.scaler.transform(X_test)
        self.y_test = y_test

        self.model = new_model()
        initialize_weights(self.model, n_features=self.X.shape[1])

    def train_one_round(self, global_weights: dict) -> tuple[dict, int, dict]:
        """Pull down global weights, train locally, return updated weights."""
        set_weights(self.model, global_weights)

        for _ in range(self.local_epochs):
            self.model.partial_fit(self.X, self.y, classes=np.array([0, 1]))

        local_weights = get_weights(self.model)
        metrics = {"bank_id": self.bank_id, "n_samples": len(self.X)}
        return local_weights, len(self.X), metrics

    def evaluate(self, weights: dict) -> dict:
        """Evaluate the given (typically global) weights on this bank's
        HELD-OUT test split -- never on data the model trained on."""
        from sklearn.metrics import accuracy_score, f1_score, roc_auc_score

        set_weights(self.model, weights)
        preds = self.model.predict(self.X_test)
        probs = self.model.predict_proba(self.X_test)[:, 1]

        return {
            "bank_id": self.bank_id,
            "accuracy": accuracy_score(self.y_test, preds),
            "f1": f1_score(self.y_test, preds, zero_division=0),
            "auc": roc_auc_score(self.y_test, probs) if len(set(self.y_test)) > 1 else float("nan"),
            "n_samples": len(self.y_test),
        }
