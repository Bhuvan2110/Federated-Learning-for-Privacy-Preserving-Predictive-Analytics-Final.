import csv
import json
from io import StringIO
from typing import Any, List
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import Dataset, ModelWeight, Experiment
from app.api.dependencies import get_current_user
from app.db.models import User

router = APIRouter()


@router.post("/upload")
async def upload_dataset(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not file.filename or not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed.")

    contents = await file.read()
    try:
        decoded = contents.decode('utf-8')
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="Invalid file encoding. Must be UTF-8.")

    csv_reader = csv.DictReader(StringIO(decoded))

    rows = list(csv_reader)
    if not rows:
        raise HTTPException(status_code=400, detail="CSV file is empty.")

    columns = list(rows[0].keys())

    # Simple automatic column profiler
    col_stats = {}
    for col in columns:
        unique_vals = set(row[col] for row in rows if row.get(col))
        missing = sum(1 for row in rows if not row.get(col))
        col_stats[col] = {
            "unique_counts": len(unique_vals),
            "missing_count": missing,
            "missing_percentage": (missing / len(rows)) * 100
        }

    # Store CSV content directly in the database — no disk required.
    # This makes uploads survive Render redeploys (ephemeral filesystem).
    dataset = Dataset(
        user_id=current_user.id,
        filename=file.filename,
        filepath=f"db://user{current_user.id}/{file.filename}",  # logical reference only
        csv_content=decoded,
        metadata_json={
            "total_rows": len(rows),
            "columns": columns,
            "stats": col_stats
        }
    )
    db.add(dataset)
    db.commit()
    db.refresh(dataset)

    return {"message": "Dataset uploaded successfully", "dataset_id": dataset.id, "metadata": dataset.metadata_json}


@router.get("/list")
def list_datasets(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    datasets = (
        db.query(Dataset)
        .filter(Dataset.user_id == current_user.id)
        .order_by(Dataset.id.desc())
        .all()
    )
    return {"datasets": [
        {
            "id": d.id,
            "filename": d.filename,
            "created_at": str(d.created_at),
            "metadata": d.metadata_json,
        }
        for d in datasets
    ]}


@router.get("/preview/{dataset_id}")
def preview_dataset(dataset_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id, Dataset.user_id == current_user.id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    # Read first 20 rows from DB-stored content
    preview_rows = []
    try:
        csv_text = dataset.csv_content
        if not csv_text:
            raise HTTPException(status_code=500, detail="CSV content not available. Please re-upload the dataset.")
        csv_reader = csv.DictReader(StringIO(csv_text))
        for i, row in enumerate(csv_reader):
            if i >= 20:
                break
            preview_rows.append(row)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading dataset: {str(e)}")

    return {
        "metadata": dataset.metadata_json,
        "preview": preview_rows
    }


@router.delete("/{dataset_id}")
def delete_dataset(dataset_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id, Dataset.user_id == current_user.id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    db.delete(dataset)
    db.commit()
    return {"message": "Dataset deleted successfully", "dataset_id": dataset_id}
