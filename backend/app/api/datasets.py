"""
Datasets API — CSV upload to Supabase Storage + preprocessing.
"""
import io
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from app.api.dependencies import get_current_user
from app.db.supabase_client import get_supabase
from app.ml.preprocessing import parse_csv, profile_columns, min_max_normalize

router = APIRouter(prefix="/dataset", tags=["datasets"])


@router.post("/upload")
async def upload_dataset(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    """Upload CSV to Supabase Storage and store metadata in DB."""
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted")

    content = await file.read()
    sb = get_supabase()
    user_id = user["id"]

    # Parse and profile
    headers, rows = parse_csv(content)
    if len(rows) < 10:
        raise HTTPException(status_code=400, detail="CSV must have at least 10 rows")

    col_profiles = profile_columns(headers, rows)
    storage_path = f"datasets/{user_id}/{file.filename}"

    # Upload to Supabase Storage
    try:
        sb.storage.from_("datasets").upload(
            storage_path, content, {"content-type": "text/csv", "upsert": "true"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Storage upload failed: {str(e)}")

    # Save metadata to DB
    result = sb.table("datasets").insert({
        "user_id": user_id,
        "filename": file.filename,
        "storage_path": storage_path,
        "cols": col_profiles,
        "row_count": len(rows),
    }).execute()

    return {
        "id": result.data[0]["id"],
        "filename": file.filename,
        "row_count": len(rows),
        "columns": col_profiles,
        "storage_path": storage_path,
    }


@router.get("/preview/{dataset_id}")
async def preview_dataset(dataset_id: str, user: dict = Depends(get_current_user)):
    """Return first 20 rows + column statistics."""
    sb = get_supabase()
    ds = sb.table("datasets").select("*").eq("id", dataset_id).eq("user_id", user["id"]).single().execute()
    if not ds.data:
        raise HTTPException(status_code=404, detail="Dataset not found")

    csv_bytes = sb.storage.from_("datasets").download(ds.data["storage_path"])
    headers, rows = parse_csv(csv_bytes)
    preview_rows = rows[:20]
    col_profiles = profile_columns(headers, rows)

    return {
        "headers": headers,
        "rows": preview_rows,
        "col_profiles": col_profiles,
        "total_rows": len(rows),
    }


@router.get("/list")
async def list_datasets(user: dict = Depends(get_current_user)):
    sb = get_supabase()
    result = sb.table("datasets").select("id, filename, row_count, created_at, cols").eq("user_id", user["id"]).order("created_at", desc=True).execute()
    return result.data


@router.delete("/{dataset_id}")
async def delete_dataset(dataset_id: str, user: dict = Depends(get_current_user)):
    sb = get_supabase()
    ds = sb.table("datasets").select("*").eq("id", dataset_id).eq("user_id", user["id"]).single().execute()
    if not ds.data:
        raise HTTPException(status_code=404, detail="Dataset not found")
    sb.storage.from_("datasets").remove([ds.data["storage_path"]])
    sb.table("datasets").delete().eq("id", dataset_id).execute()
    return {"message": "Dataset deleted"}
