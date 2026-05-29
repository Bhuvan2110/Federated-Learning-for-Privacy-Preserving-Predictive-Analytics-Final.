import pytest
from app.ml.metrics import confusion_matrix, feature_importance

def test_confusion_matrix():
    y_true = [1, 0, 1, 1, 0]
    y_pred = [1, 0, 0, 1, 0]
    metrics = confusion_matrix(y_true, y_pred)
    assert metrics["TP"] == 2
    assert metrics["TN"] == 2
    assert metrics["FP"] == 0
    assert metrics["FN"] == 1

def test_feature_importance():
    weights = [0.5, -1.2, 0.3]
    features = ["age", "income", "score"]
    importance = feature_importance(weights, features)
    assert importance[0]["feature"] == "income"
    assert importance[0]["importance"] == 1.2
