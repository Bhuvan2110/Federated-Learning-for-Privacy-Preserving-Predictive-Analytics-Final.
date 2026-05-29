from typing import List, Tuple

def fedavg(client_weights_list: List[List[float]], client_biases: List[float], data_sizes: List[int]) -> Tuple[List[float], float]:
    """
    Computes FedAvg: weighted average of client weights based on dataset size.
    """
    total_data = sum(data_sizes)
    n_features = len(client_weights_list[0])
    
    global_weights = [0.0] * n_features
    global_bias = 0.0
    
    for i in range(len(client_weights_list)):
        weight_factor = data_sizes[i] / total_data
        for j in range(n_features):
            global_weights[j] += client_weights_list[i][j] * weight_factor
        global_bias += client_biases[i] * weight_factor
        
    return global_weights, global_bias

def scaffold_update(client_weights: List[float], client_control: List[float], global_control: List[float], learning_rate: float) -> List[float]:
    """
    SCAFFOLD applies a correction based on the difference between global and local control variates.
    """
    n_features = len(client_weights)
    adjusted_weights = list(client_weights)
    for j in range(n_features):
        correction = learning_rate * (global_control[j] - client_control[j])
        adjusted_weights[j] -= correction
    return adjusted_weights
