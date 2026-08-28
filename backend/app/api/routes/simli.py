"""
Simli Avatar API Routes
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import uuid

from app.services.simli_service import simli_service

router = APIRouter(prefix="/api/simli", tags=["simli"])


class CreateSessionRequest(BaseModel):
    interview_id: Optional[str] = None
    candidate_name: str = "Candidate"


class SpeakRequest(BaseModel):
    room_name: str
    text: str


@router.post("/create-session")
async def create_session(request: CreateSessionRequest):
    """
    Create a new Simli avatar interview session
    Returns LiveKit connection details
    """
    try:
        # Generate interview ID if not provided
        interview_id = request.interview_id or str(uuid.uuid4())
        
        # Create session
        session_data = await simli_service.create_interview_session(
            interview_id=interview_id,
            candidate_name=request.candidate_name
        )
        
        return {
            "success": True,
            "data": session_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/speak")
async def speak(request: SpeakRequest):
    """
    Make the avatar speak text in a room
    """
    try:
        await simli_service.speak_text(
            room_name=request.room_name,
            text=request.text
        )
        
        return {
            "success": True,
            "message": "Text sent to avatar"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health():
    """Check if Simli service is configured"""
    configured = simli_service.api_key is not None
    return {
        "configured": configured,
        "face_id": simli_service.face_id if configured else None
    }
