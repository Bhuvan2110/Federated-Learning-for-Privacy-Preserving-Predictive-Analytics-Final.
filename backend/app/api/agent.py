import os
import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from app.api.dependencies import get_current_user
from app.db.models import User

router = APIRouter()

class ChatMessage(BaseModel):
    role: str  # "user" or "model"
    content: str

class ChatPayload(BaseModel):
    message: str
    apiKey: Optional[str] = None
    history: Optional[List[ChatMessage]] = None

GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"

SYSTEM_INSTRUCTION = (
    "You are a helpful, professional, and knowledgeable AI Assistant for the Federated Learning "
    "Privacy-Preserving Predictive Analytics Platform.\n\n"
    "This platform is built entirely from scratch in pure Python (no scikit-learn, PyTorch, or TensorFlow) "
    "and implements advanced machine learning and cryptographic protocols from first principles.\n\n"
    "Platform Capabilities:\n"
    "- **ML Models**: Pure Python Logistic Regression.\n"
    "- **Federated Learning Algorithms**: FedAvg (Federated Averaging), FedProx (remedies client drift on heterogeneous/non-IID data using a proximal term), and SCAFFOLD (corrects client drift with control variates).\n"
    "- **Privacy**: DP-SGD (Differential Privacy SGD) with Gaussian noise injection and gradient clipping.\n"
    "- **Calibration**: Platt Scaling is used to calibrate outputs into accurate probability/confidence values.\n"
    "- **Security**: RSA-2048 key generation, AES-256-GCM encryption for client datasets and model weights, JWT authorization, and Bcrypt hashing.\n\n"
    "Features of the Web App:\n"
    "1. **Dashboard**: Shows total uploaded datasets, total training runs (completed, running, failed), and recent activity.\n"
    "2. **Datasets**: Users upload custom CSV datasets. The system encrypts them using AES-256-GCM and stores them. Users can view dataset headers, shapes, and delete them.\n"
    "3. **Training**: Users configure a federated training run by selecting an algorithm, communication rounds, learning rate, DP parameters, and starting the task.\n"
    "4. **Prediction**: Users load a trained model to make real-time predictions. Supports single input feature forms and bulk batch predictions by uploading a CSV.\n\n"
    "Guidelines:\n"
    "- Provide clear, concise, and helpful advice on using the platform.\n"
    "- Answer general AI, machine learning, and privacy-preserving queries, linking them to how this platform implements them.\n"
    "- Be encouraging, technical but accessible, and formatting answers in clean markdown."
)

@router.post("/chat")
async def chat_with_agent(
    payload: ChatPayload,
    current_user: User = Depends(get_current_user)
):
    api_key = payload.apiKey or os.environ.get("GEMINI_API_KEY")
    
    if not api_key:
        return {
            "response": (
                "👋 **Welcome to the Federated Learning Platform Assistant!**\n\n"
                "Currently, no Gemini API Key is configured on the backend. To enable dynamic, full AI conversation, "
                "please obtain a free API key from [Google AI Studio](https://aistudio.google.com/) and "
                "paste it in the **Settings** panel inside this chat widget.\n\n"
                "Here is a quick reference to get you started with the platform:\n\n"
                "### 📁 1. Manage Datasets\n"
                "Head to the **[Datasets](/datasets)** tab. You can upload custom CSV files. "
                "Your data is automatically secured using **AES-256-GCM symmetric encryption** during upload.\n\n"
                "### ⚙️ 2. Start Federated Training\n"
                "Navigate to **[Training](/training)** to spin up a federated experiment. Choose from:\n"
                "- **FedAvg**: The standard federated aggregation strategy.\n"
                "- **FedProx**: Better handling for heterogeneous (non-IID) datasets.\n"
                "- **SCAFFOLD**: Corrects drift using control variates.\n"
                "- **Differential Privacy (DP-SGD)**: Add mathematical noise and gradient clipping to protect against leakage.\n\n"
                "### 🔮 3. Make Predictions\n"
                "Once training completes, go to **[Prediction](/predict)**. Select your model and choose:\n"
                "- **Single Prediction**: Enter feature coordinates manually.\n"
                "- **Batch Prediction**: Upload a CSV to get predictions and calibrated confidence values using **Platt Scaling**.\n\n"
                "*If you have any questions about Federated Learning, privacy math, or platform usage, add a Gemini API Key to unlock interactive chat!*"
            ),
            "is_fallback": True
        }

    contents = []
    
    if payload.history:
        for msg in payload.history:
            role = "model" if msg.role == "model" else "user"
            contents.append({
                "role": role,
                "parts": [{"text": msg.content}]
            })
            
    contents.append({
        "role": "user",
        "parts": [{"text": payload.message}]
    })

    body = {
        "contents": contents,
        "systemInstruction": {
            "parts": [{"text": SYSTEM_INSTRUCTION}]
        }
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{GEMINI_API_URL}?key={api_key}",
                json=body,
                headers={"Content-Type": "application/json"},
                timeout=30.0
            )
            
            if response.status_code != 200:
                error_detail = response.json().get("error", {}).get("message", "Gemini API request failed")
                raise HTTPException(status_code=response.status_code, detail=error_detail)
                
            resp_data = response.json()
            candidates = resp_data.get("candidates", [])
            if not candidates:
                return {"response": "The AI agent did not return a response. Please try again.", "is_fallback": False}
                
            text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
            return {
                "response": text,
                "is_fallback": False
            }
            
        except HTTPException as he:
            raise he
        except httpx.HTTPError as e:
            raise HTTPException(status_code=500, detail=f"HTTP network error contacting Gemini API: {str(e)}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")
