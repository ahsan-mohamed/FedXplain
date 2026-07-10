"""
flower_server.py

Orchestrates the federated training process across all BankClients:
for N rounds, ask every bank to train locally starting from the current
global weights, collect their updates, FedAvg them into a new global
model, and repeat.

NOTE ON NAMING: this file is named flower_server.py to match the planned
architecture (so it's a drop-in slot for real Flower `ServerApp` /
`start_server` code later). Right now it's a manual FedAvg loop -- this
was a deliberate scope decision (see train_federated.py) to keep the
whole pipeline runnable without the `flwr` package and its dependency
weight, while still being 100% faithful to the real FedAvg algorithm.
Swapping this for actual `flwr.simulation.start_simulation(...)` later
is a drop-in change since get_weights/set_weights/fedavg already match
Flower's `Parameters` conventions.
"""

import numpy as np

from federated.model_def import new_model, initialize_weights, get_weights, fedavg


class FederatedServer:
    def __init__(self, clients: list, n_features: int = 30):
        self.clients = clients
        global_model = new_model()
        initialize_weights(global_model, n_features=n_features)
        self.global_weights = get_weights(global_model)
        self.history = []

    def run_round(self, round_num: int) -> dict:
        local_weights, sample_counts, client_metrics = [], [], []

        for client in self.clients:
            weights, n_samples, metrics = client.train_one_round(self.global_weights)
            local_weights.append(weights)
            sample_counts.append(n_samples)
            client_metrics.append(metrics)

        self.global_weights = fedavg(local_weights, sample_counts)

        eval_metrics = [client.evaluate(self.global_weights) for client in self.clients]
        avg_f1 = np.mean([m["f1"] for m in eval_metrics])
        avg_auc = np.nanmean([m["auc"] for m in eval_metrics])
        avg_acc = np.mean([m["accuracy"] for m in eval_metrics])

        round_summary = {
            "round": round_num,
            "avg_accuracy": avg_acc,
            "avg_f1": avg_f1,
            "avg_auc": avg_auc,
            "per_bank": eval_metrics,
        }
        self.history.append(round_summary)
        return round_summary

    def run(self, n_rounds: int = 10, verbose: bool = True) -> list[dict]:
        for r in range(1, n_rounds + 1):
            summary = self.run_round(r)
            if verbose:
                print(f"Round {r:2d} | acc={summary['avg_accuracy']:.4f} "
                      f"f1={summary['avg_f1']:.4f} auc={summary['avg_auc']:.4f}")
        return self.history

    def get_global_weights(self) -> dict:
        return self.global_weights
