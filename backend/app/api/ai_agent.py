from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from app.api.dependencies import get_current_user
from app.db.supabase_client import get_supabase
from app.api.predict import _load_model

router = APIRouter(prefix="/ai-agent", tags=["ai agent"])


class ChatRequest(BaseModel):
    question: str
    model_id: str | None = None


@router.post("/chat")
async def chat_with_agent(body: ChatRequest, user: dict = Depends(get_current_user)):
    sb = get_supabase()
    feature_names = []
    categorical_features = []

    if body.model_id:
        model_row = sb.table("models").select("*").eq("id", body.model_id).single().execute()
        if not model_row.data:
            raise HTTPException(status_code=404, detail="Model not found")
        model_data = _load_model(body.model_id, sb)
        feature_names = model_data.get("feature_names", [])
        categorical_features = list(model_data.get("encoders", {}).keys())

    question = body.question.strip().lower()
    if not question:
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    if any(term in question for term in ["feature", "input", "column", "sl.no", "sl no", "slno"]):
        if feature_names:
            answer = "This model expects the following feature values: " + ", ".join(feature_names)
            if categorical_features:
                answer += ".\nCategorical features: " + ", ".join(categorical_features)
            return {"answer": answer}
        return {"answer": "No model is selected or the selected model has no metadata available. Please select a trained model first."}

    if any(term in question for term in ["predict", "output", "result", "classification"]):
        return {"answer": "Use the prediction input form above to enter values for each feature and click Predict. I can also tell you which feature names are required for the selected model."}

    return {
        "answer": (
            "I can help you understand the prediction features and guide you through building input values. "
            "Ask me about 'features', 'input', or 'columns' for your selected model."
        )
    }
