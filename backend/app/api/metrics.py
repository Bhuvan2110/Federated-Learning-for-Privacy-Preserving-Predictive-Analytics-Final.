from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import ModelWeight, Experiment, User
from app.api.dependencies import get_current_user

router = APIRouter()

@router.get("/{experiment_id}")
def get_experiment_metrics(
    experiment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    experiment = (
        db.query(Experiment)
        .filter(Experiment.id == experiment_id, Experiment.user_id == current_user.id)
        .first()
    )
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found or not owned by you")
        
    models = db.query(ModelWeight).filter(ModelWeight.experiment_id == experiment_id).order_by(ModelWeight.round_number).all()
    
    loss_curve = []
    acc_curve = []
    final_metrics = {}
    
    for m in models:
        if m.metrics_json:
            loss_curve.append(m.metrics_json.get("loss", 0.0))
            acc_curve.append(m.metrics_json.get("accuracy", 0.0))
            if m == models[-1]:
                final_metrics = m.metrics_json
                
    return {
        "experiment": {
            "name": experiment.name,
            "status": experiment.status,
            "algorithm": experiment.algorithm
        },
        "curves": {
            "loss": loss_curve,
            "accuracy": acc_curve
        },
        "final_metrics": final_metrics
    }
