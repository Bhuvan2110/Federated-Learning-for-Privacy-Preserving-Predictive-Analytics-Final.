from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import Any, Dict, List
import csv
from io import StringIO
from app.db.session import get_db
from app.db.models import ModelWeight, Prediction, Experiment, User
from app.api.dependencies import get_current_user
from app.ml.logistic_regression import dot_product
from app.ml.metrics import calibrate_probability

router = APIRouter()

def _parse_feature(val: Any) -> float:
    if val is None:
        return 0.0
    if isinstance(val, (int, float)):
        return float(val)
    val_str = str(val).strip()
    try:
        return float(val_str)
    except ValueError:
        # Standardize categorical inputs
        lower_val = val_str.lower()
        if lower_val in ["male", "m", "yes", "y", "true", "t"]:
            return 1.0
        elif lower_val in ["female", "f", "no", "n", "false", "off"]:
            return 0.0
        elif lower_val in ["other", "others", "o"]:
            return 0.5
        else:
            # Deterministic hash mapping for custom names/text
            char_sum = sum(ord(c) for c in val_str)
            return float(char_sum % 100) / 100.0

@router.post("/single")
def predict_single(
    payload: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    model_id = payload.get("model_id")
    features = payload.get("features", [])
    platt_a = payload.get("platt_a", 1.0)
    platt_b = payload.get("platt_b", 0.0)
    
    # Verify model exists and belongs to the current user's experiment
    model = (
        db.query(ModelWeight)
        .join(Experiment, ModelWeight.experiment_id == Experiment.id)
        .filter(ModelWeight.id == model_id, Experiment.user_id == current_user.id)
        .first()
    )
    if not model:
        # Fallback: check if model_id is actually an experiment_id, and get the final round's weights
        model = (
            db.query(ModelWeight)
            .join(Experiment, ModelWeight.experiment_id == Experiment.id)
            .filter(Experiment.id == model_id, Experiment.user_id == current_user.id)
            .order_by(ModelWeight.round_number.desc())
            .first()
        )
    if not model:
        raise HTTPException(status_code=404, detail="Model not found or not owned by you")
        
    weights = model.weights_json.get("weights", []) if model.weights_json else []
    bias = model.weights_json.get("bias", 0.0) if model.weights_json else 0.0
    
    if len(weights) != len(features):
        raise HTTPException(status_code=400, detail="Feature dimension mismatch")
        
    parsed_features = [_parse_feature(f) for f in features]
    logit = dot_product(parsed_features, weights) + bias
    confidence = calibrate_probability(logit, platt_a, platt_b)
    pred_class = 1 if confidence >= 0.5 else 0
    
    prediction = Prediction(
        model_id=model.id,
        input_data={"features": features},
        output_result={"class": pred_class},
        confidence=confidence
    )
    db.add(prediction)
    db.commit()
    db.refresh(prediction)
    
    return {
        "prediction_id": prediction.id,
        "class": pred_class,
        "confidence": confidence
    }

@router.post("/batch")
async def predict_batch(
    model_id: int,
    platt_a: float = 1.0,
    platt_b: float = 0.0,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not file.filename or not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files allowed")
        
    # Verify model exists and belongs to the current user's experiment
    model = (
        db.query(ModelWeight)
        .join(Experiment, ModelWeight.experiment_id == Experiment.id)
        .filter(ModelWeight.id == model_id, Experiment.user_id == current_user.id)
        .first()
    )
    if not model:
        # Fallback: check if model_id is actually an experiment_id, and get the final round's weights
        model = (
            db.query(ModelWeight)
            .join(Experiment, ModelWeight.experiment_id == Experiment.id)
            .filter(Experiment.id == model_id, Experiment.user_id == current_user.id)
            .order_by(ModelWeight.round_number.desc())
            .first()
        )
    if not model:
        raise HTTPException(status_code=404, detail="Model not found or not owned by you")
        
    weights = model.weights_json.get("weights", []) if model.weights_json else []
    bias = model.weights_json.get("bias", 0.0) if model.weights_json else 0.0
    
    contents = await file.read()
    decoded = contents.decode('utf-8')
    csv_reader = csv.reader(StringIO(decoded))
    
    rows = list(csv_reader)
    if not rows or len(rows) < 2:
        raise HTTPException(status_code=400, detail="CSV is empty or missing data")
        
    results: List[Dict[str, Any]] = []
    for i in range(1, len(rows)):
        try:
            features = [_parse_feature(x) for x in rows[i]]
            if len(features) != len(weights):
                results.append({"row": i, "error": "Dimension mismatch"})
                continue
                
            logit = dot_product(features, weights) + bias
            confidence = calibrate_probability(logit, platt_a, platt_b)
            pred_class = 1 if confidence >= 0.5 else 0
            results.append({
                "row": i,
                "class": pred_class,
                "confidence": confidence
            })
        except Exception as e:
            results.append({"row": i, "error": f"Failed to process row: {str(e)}"})
            
    return {"results": results}
