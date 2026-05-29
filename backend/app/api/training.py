from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Any, cast
import random
import time
from app.db.session import get_db, SessionLocal
from app.db.models import Experiment, Dataset, ModelWeight, User
from app.api.dependencies import get_current_user

router = APIRouter()


@router.post("/federated")
async def start_federated_training(
    config: dict[str, Any],
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """
    config payload expects:
    {
        "dataset_id": 1,
        "algorithm": "FedAvg",
        "rounds": 10,
        "clients": 3,
        "epochs": 5,
        "learning_rate": 0.01,
        "mu": 0.0,
        "dp_epsilon": 0.0
    }
    """
    dataset_id = config.get("dataset_id")
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id, Dataset.user_id == current_user.id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found or not owned by you")

    experiment = Experiment(
        user_id=current_user.id,
        name=f"FL_{config.get('algorithm')}_{dataset_id}",
        algorithm=config.get("algorithm"),
        config_json=config,
        status="running",
    )
    db.add(experiment)
    db.commit()
    db.refresh(experiment)

    exp_id: int = cast(int, experiment.id)
    background_tasks.add_task(  # type: ignore[arg-type]
        run_training_stub, exp_id, config, str(dataset.filepath)
    )

    return {"message": "Training job started", "experiment_id": exp_id}


@router.get("/compare")
def compare_experiments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    experiments = (
        db.query(Experiment)
        .filter(Experiment.user_id == current_user.id)
        .order_by(Experiment.id.desc())
        .all()
    )
    return {
        "experiments": [
            {
                "id": e.id,
                "name": e.name,
                "status": e.status,
                "algorithm": e.algorithm,
                "created_at": str(e.created_at),
                "config": e.config_json,
            }
            for e in experiments
        ]
    }


@router.delete("/{experiment_id}")
def delete_experiment(
    experiment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    experiment = db.query(Experiment).filter(
        Experiment.id == experiment_id,
        Experiment.user_id == current_user.id,
    ).first()
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found or not owned by you")

    if experiment.status == "running":
        raise HTTPException(status_code=400, detail="Cannot delete a running experiment. Wait for it to complete.")

    # Delete associated model weights first
    db.query(ModelWeight).filter(ModelWeight.experiment_id == experiment_id).delete()
    db.delete(experiment)
    db.commit()
    return {"message": "Experiment deleted successfully", "experiment_id": experiment_id}


# ---------------------------------------------------------------------------
# Background training task
# ---------------------------------------------------------------------------

def _count_features(meta: dict[str, Any]) -> int:
    """Return feature count from dataset metadata (columns minus label column)."""
    cols: list[Any] = meta.get("columns", [])  # type: ignore[assignment]
    return max(1, len(cols) - 1)


def _build_round_metrics(loss: float, accuracy: float) -> dict[str, float]:
    return {"loss": round(loss, 4), "accuracy": round(accuracy, 4)}


def _build_weights_payload(weights: list[float], bias: float) -> dict[str, Any]:
    return {"weights": weights, "bias": bias}


def run_training_stub(
    experiment_id: int,
    config: dict[str, Any],
    dataset_path: str,
) -> None:
    db = SessionLocal()  # type: ignore[no-untyped-call]

    experiment: Experiment | None = (
        db.query(Experiment).filter(Experiment.id == experiment_id).first()
    )
    if experiment is None:
        db.close()
        return

    try:
        rounds: int = int(config.get("rounds", 10))
        if config.get("algorithm") == "Centralized":
            rounds = 1

        dataset_id = config.get("dataset_id")
        dataset: Dataset | None = (
            db.query(Dataset).filter(Dataset.id == dataset_id).first()
        )

        num_features: int = 5
        if dataset is not None and dataset.metadata_json:
            meta: dict[str, Any] = dict(dataset.metadata_json)  # type: ignore[arg-type]
            if "columns" in meta:
                num_features = _count_features(meta)

        base_loss: float = 0.8
        base_acc: float = 0.5

        for r in range(1, rounds + 1):
            time.sleep(0.5)

            weights: list[float] = [random.uniform(-1.0, 1.0) for _ in range(num_features)]
            bias: float = random.uniform(-0.5, 0.5)
            improvement: float = r / rounds
            loss: float = max(0.05, base_loss - 0.65 * improvement + random.uniform(-0.03, 0.03))
            accuracy: float = min(0.99, base_acc + 0.44 * improvement + random.uniform(-0.02, 0.02))

            mw = ModelWeight(
                experiment_id=experiment_id,
                round_number=r,
                weights_json=_build_weights_payload(weights, bias),
                metrics_json=_build_round_metrics(loss, accuracy),
            )
            db.add(mw)
            db.commit()

        experiment.status = "completed"  # type: ignore[assignment]
        db.commit()

    except Exception:
        if experiment is not None:
            experiment.status = "failed"  # type: ignore[assignment]
            db.commit()
    finally:
        db.close()
