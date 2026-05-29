import math
from typing import List, Tuple, Dict, Any

def platt_scaling(logits: List[float], y_true: List[float], epochs: int = 100, lr: float = 0.01) -> Tuple[float, float]:
    """
    Fits Platt scaling parameters A and B using gradient descent.
    P(y=1|x) = 1 / (1 + exp(-(A * logit + B)))
    """
    A, B = 1.0, 0.0
    m = len(y_true)
    if m == 0:
        return A, B
        
    for _ in range(epochs):
        dA, dB = 0.0, 0.0
        for i in range(m):
            z = A * logits[i] + B
            z = max(min(z, 250), -250)
            p = 1.0 / (1.0 + math.exp(-z))
            
            error = p - y_true[i]
            dA += error * logits[i]
            dB += error
            
        A -= lr * (dA / m)
        B -= lr * (dB / m)
        
    return A, B

def calibrate_probability(logit: float, A: float, B: float) -> float:
    z = A * logit + B
    z = max(min(z, 250), -250)
    return 1.0 / (1.0 + math.exp(-z))

def confusion_matrix(y_true: List[int], y_pred: List[int]) -> Dict[str, Any]:
    tp = tn = fp = fn = 0
    for yt, yp in zip(y_true, y_pred):
        if yt == 1 and yp == 1:
            tp += 1
        elif yt == 0 and yp == 0:
            tn += 1
        elif yt == 0 and yp == 1:
            fp += 1
        elif yt == 1 and yp == 0:
            fn += 1
            
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0.0
    accuracy = (tp + tn) / (tp + tn + fp + fn) if (tp + tn + fp + fn) > 0 else 0.0
    
    return {
        "TP": tp, "TN": tn, "FP": fp, "FN": fn,
        "precision": precision,
        "recall": recall,
        "f1_score": f1,
        "accuracy": accuracy
    }

def roc_auc(y_true: List[int], y_prob: List[float]) -> Tuple[List[float], List[float], float]:
    sorted_pairs = sorted(zip(y_prob, y_true), key=lambda x: x[0], reverse=True)
    y_prob_sorted = [x[0] for x in sorted_pairs]
    y_true_sorted = [x[1] for x in sorted_pairs]
    
    positives = sum(y_true_sorted)
    negatives = len(y_true_sorted) - positives
    
    if positives == 0 or negatives == 0:
        return [0.0, 1.0], [0.0, 1.0], 0.0
        
    tpr_list = [0.0]
    fpr_list = [0.0]
    
    tp = 0
    fp = 0
    
    last_prob = float('inf')
    
    for prob, label in zip(y_prob_sorted, y_true_sorted):
        if prob != last_prob:
            tpr_list.append(tp / positives)
            fpr_list.append(fp / negatives)
            last_prob = prob
            
        if label == 1:
            tp += 1
        else:
            fp += 1
            
    tpr_list.append(1.0)
    fpr_list.append(1.0)
    
    auc = 0.0
    for i in range(1, len(fpr_list)):
        width = fpr_list[i] - fpr_list[i-1]
        height = (tpr_list[i] + tpr_list[i-1]) / 2.0
        auc += width * height
        
    return fpr_list, tpr_list, auc

def feature_importance(weights: List[float], feature_names: List[str]) -> List[Dict[str, Any]]:
    importance = [{"feature": name, "importance": abs(w)} for name, w in zip(feature_names, weights)]
    return sorted(importance, key=lambda x: x["importance"], reverse=True)
