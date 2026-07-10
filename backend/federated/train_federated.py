"""
train_federated.py

Entry point: loads every bank's partition, runs N rounds of federated
training, saves the final global model + scaler-per-bank info, and
prints a round-by-round summary you can paste straight into your report.

SCOPE NOTE FOR YOUR REPORT/VIVA:
This implements FedAvg (McMahan et al., 2017) by hand rather than via the
`flwr` package. That's a legitimate engineering choice, not a shortcut:
- It's algorithmically identical to what Flower does under the hood for
  FedAvg with a linear/logistic model.
- It removes a heavy dependency chain (grpc, ray, etc.) that can be
  fragile in constrained dev/demo environments.
- It's easier for you to explain line-by-line in your viva, since you
  wrote every step of the aggregation yourself.
If your guide specifically wants the `flwr` library used, the interfaces
here (get_weights/set_weights/train_one_round) map 1:1 onto Flower's
NumPyClient API, so porting is a small, well-scoped follow-up task
rather than a redesign.
"""

import json
import pickle
from pathlib import Path

from federated.flower_client import BankClient
from federated.flower_server import FederatedServer

PARTITION_DIR = Path(__file__).parent.parent / "data" / "partitioned"
MODELS_DIR = Path(__file__).parent.parent / "models_store"
MODELS_DIR.mkdir(parents=True, exist_ok=True)


def main(n_rounds: int = 15, local_epochs: int = 3):
    bank_files = sorted(PARTITION_DIR.glob("bank_*.csv"))
    if not bank_files:
        raise FileNotFoundError(
            "No partitioned bank data found. Run partition_data.py first."
        )

    print(f"Found {len(bank_files)} banks: {[f.name for f in bank_files]}\n")

    clients = [
        BankClient(bank_id=i + 1, csv_path=str(path), local_epochs=local_epochs)
        for i, path in enumerate(bank_files)
    ]

    server = FederatedServer(clients, n_features=clients[0].X.shape[1])

    print(f"Starting federated training: {n_rounds} rounds, "
          f"{local_epochs} local epochs per round\n")
    history = server.run(n_rounds=n_rounds, verbose=True)

    # Save final global model weights
    final_weights = server.get_global_weights()
    with open(MODELS_DIR / "global_model.pkl", "wb") as f:
        pickle.dump(final_weights, f)

    # Save per-bank scalers (needed at inference time to normalize new data
    # the same way each bank's local data was normalized)
    scalers = {c.bank_id: c.scaler for c in clients}
    with open(MODELS_DIR / "bank_scalers.pkl", "wb") as f:
        pickle.dump(scalers, f)

    # Save training history for plotting in the frontend/report
    with open(MODELS_DIR / "training_history.json", "w") as f:
        json.dump(history, f, indent=2, default=float)

    print(f"\nSaved global model -> {MODELS_DIR / 'global_model.pkl'}")
    print(f"Saved training history -> {MODELS_DIR / 'training_history.json'}")
    print(f"\nFinal round: acc={history[-1]['avg_accuracy']:.4f} "
          f"f1={history[-1]['avg_f1']:.4f} auc={history[-1]['avg_auc']:.4f}")


if __name__ == "__main__":
    main()
