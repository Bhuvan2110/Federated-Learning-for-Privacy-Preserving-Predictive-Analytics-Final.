import math
from typing import List, Optional, Tuple

def dot_product(v1: List[float], v2: List[float]) -> float:
    return sum(x * y for x, y in zip(v1, v2))

def sigmoid(z: float) -> float:
    if z < -250:
        return 0.0
    elif z > 250:
        return 1.0
    return 1.0 / (1.0 + math.exp(-z))

def compute_loss(X: List[List[float]], y: List[float], weights: List[float], bias: float) -> float:
    m = len(y)
    total_loss = 0.0
    for i in range(m):
        z = dot_product(X[i], weights) + bias
        pred = sigmoid(z)
        epsilon = 1e-15
        pred = max(min(pred, 1 - epsilon), epsilon)
        total_loss += - (y[i] * math.log(pred) + (1 - y[i]) * math.log(1 - pred))
    return total_loss / m

def compute_gradients(X: List[List[float]], y: List[float], weights: List[float], bias: float, mu: float = 0.0, global_weights: Optional[List[float]] = None) -> Tuple[List[float], float]:
    m = len(y)
    n = len(weights)
    dw = [0.0] * n
    db = 0.0
    
    for i in range(m):
        z = dot_product(X[i], weights) + bias
        pred = sigmoid(z)
        dz = pred - y[i]
        
        for j in range(n):
            dw[j] += dz * X[i][j]
        db += dz
        
    for j in range(n):
        dw[j] /= m
        if mu > 0 and global_weights is not None:
            dw[j] += mu * (weights[j] - global_weights[j])
            
    db /= m
    return dw, db

def train_client(X: List[List[float]], y: List[float], initial_weights: List[float], initial_bias: float,
                 learning_rate: float, epochs: int, mu: float = 0.0, global_weights: Optional[List[float]] = None) -> Tuple[List[float], float]:
    weights = list(initial_weights)
    bias = initial_bias
    n = len(weights)
    
    for epoch in range(epochs):
        dw, db = compute_gradients(X, y, weights, bias, mu, global_weights)
        
        for j in range(n):
            weights[j] -= learning_rate * dw[j]
        bias -= learning_rate * db
        
    return weights, bias

def predict(X: List[List[float]], weights: List[float], bias: float) -> List[float]:
    predictions = []
    for i in range(len(X)):
        z = dot_product(X[i], weights) + bias
        predictions.append(sigmoid(z))
    return predictions
