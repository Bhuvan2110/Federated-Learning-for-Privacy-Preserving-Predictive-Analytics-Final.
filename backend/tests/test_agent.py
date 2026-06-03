from fastapi.testclient import TestClient
from app.main import app
from app.api.dependencies import get_current_user
from app.db.models import User

def mock_current_user():
    return User(id=1, email="test@example.com", role="User")

def test_agent_chat_no_auth():
    client = TestClient(app)
    response = client.post("/api/agent/chat", json={"message": "Hello"})
    assert response.status_code == 401

def test_agent_chat_fallback():
    client = TestClient(app)
    app.dependency_overrides[get_current_user] = mock_current_user
    try:
        response = client.post("/api/agent/chat", json={"message": "How do I upload a dataset?"})
        assert response.status_code == 200
        json_data = response.json()
        assert "response" in json_data
        assert json_data["is_fallback"] is True
        assert "Manage Datasets" in json_data["response"]
    finally:
        del app.dependency_overrides[get_current_user]
