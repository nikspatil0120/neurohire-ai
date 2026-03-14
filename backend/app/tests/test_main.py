import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_root_endpoint():
    """Test root endpoint"""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert "version" in data

def test_health_check():
    """Test health check endpoint"""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"

def test_system_info():
    """Test system info endpoint"""
    response = client.get("/api/v1/system/info")
    assert response.status_code == 200
    data = response.json()
    assert "app_name" in data
    assert "features" in data
    assert data["features"]["ai_interview"] == True