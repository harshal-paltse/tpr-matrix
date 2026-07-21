import numpy as np
import random
from typing import Dict, Any, List

class FederatedLearningCoordinator:
    def __init__(self):
        # Global model weights for our forecasting LSTM/regression nodes
        # Represents [coefficient_for_rainfall, coefficient_for_price, coefficient_for_cost]
        self.global_weights = [0.45, 0.35, -0.20]
        self.global_bias = 5.0
        self.current_round = 0
        self.history = []
        self.epsilon_budget_spent = 0.0

        # Village client configurations
        self.clients = {
            "node_cotton_village": {
                "name": "Cotton Village Node (Node 1)",
                "data_points": 120,
                "local_drift": [0.05, 0.08, -0.02], # local trend deviations
                "epsilon": 1.5 # Privacy budget per round
            },
            "node_dairy_village": {
                "name": "Dairy Village Node (Node 2)",
                "data_points": 85,
                "local_drift": [-0.02, 0.12, -0.05],
                "epsilon": 1.5
            },
            "node_rice_village": {
                "name": "Rice Village Node (Node 3)",
                "data_points": 150,
                "local_drift": [0.08, -0.04, -0.01],
                "epsilon": 1.5
            }
        }

    def train_client_locally(self, client_id: str, global_weights: List[float], global_bias: float) -> Dict[str, Any]:
        """
        Simulates local training on client data and adding Differential Privacy noise.
        """
        client = self.clients[client_id]
        drift = client["local_drift"]
        
        # Simulate gradient descent shifting weights towards local optimum
        local_weights = [gw + drift[i] + random.uniform(-0.02, 0.02) for i, gw in enumerate(global_weights)]
        local_bias = global_bias + random.uniform(-0.1, 0.1)
        
        # Apply Differential Privacy (Laplace Mechanism)
        # Noise scale = Sensitivity / Epsilon
        # Assume Sensitivity of weight updates is bounded by 0.05
        sensitivity = 0.05
        epsilon = client["epsilon"]
        noise_scale = sensitivity / epsilon
        
        dp_noise_weights = np.random.laplace(0.0, noise_scale, size=len(local_weights))
        dp_noise_bias = np.random.laplace(0.0, noise_scale)
        
        sanitized_weights = [float(w + dp_noise_weights[i]) for i, w in enumerate(local_weights)]
        sanitized_bias = float(local_bias + dp_noise_bias)
        
        return {
            "weights": sanitized_weights,
            "bias": sanitized_bias,
            "data_points": client["data_points"]
        }

    def run_aggregation_round(self) -> Dict[str, Any]:
        """
        Aggregates local updates from all village nodes using Federated Averaging (FedAvg).
        """
        self.current_round += 1
        
        client_updates = {}
        for cid in self.clients:
            client_updates[cid] = self.train_client_locally(cid, self.global_weights, self.global_bias)
            
        # FedAvg: weighted average based on local data points size
        total_data_points = sum(update["data_points"] for update in client_updates.values())
        
        new_weights = [0.0, 0.0, 0.0]
        new_bias = 0.0
        
        for cid, update in client_updates.items():
            weight_factor = update["data_points"] / total_data_points
            for i in range(len(new_weights)):
                new_weights[i] += update["weights"][i] * weight_factor
            new_bias += update["bias"] * weight_factor
            
        # Update global parameters
        self.global_weights = [float(round(w, 4)) for w in new_weights]
        self.global_bias = float(round(new_bias, 4))
        
        # Track privacy budget (Epsilon adds up under composition)
        # Using simple composition rule: sum of epsilons (1.5 per client, avg composition)
        self.epsilon_budget_spent += 1.5
        
        # Compute dummy training loss for history
        simulated_loss = float(max(0.08, 0.45 - 0.05 * self.current_round + random.uniform(-0.02, 0.02)))
        
        round_metrics = {
            "round": self.current_round,
            "global_weights": self.global_weights,
            "global_bias": self.global_bias,
            "training_loss": simulated_loss,
            "epsilon_spent": self.epsilon_budget_spent,
            "client_updates": client_updates
        }
        
        self.history.append(round_metrics)
        return round_metrics

    def get_status(self) -> Dict[str, Any]:
        return {
            "global_weights": self.global_weights,
            "global_bias": self.global_bias,
            "current_round": self.current_round,
            "history": self.history,
            "epsilon_spent": self.epsilon_budget_spent
        }
