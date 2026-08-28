"""
Simli Avatar Service
Handles Simli avatar integration via LiveKit
"""
import os
import logging
from typing import Optional
from livekit import api, rtc
import asyncio

logger = logging.getLogger(__name__)


class SimliAvatarService:
    """Service for managing Simli avatar sessions"""
    
    def __init__(self):
        # Explicitly load .env to ensure variables are available
        from dotenv import load_dotenv
        load_dotenv(override=True)
        
        self.api_key = os.getenv("SIMLI_API_KEY")
        self.face_id = os.getenv("SIMLI_FACE_ID")
        self.livekit_url = os.getenv("LIVEKIT_URL", "ws://localhost:7880")
        self.livekit_api_key = os.getenv("LIVEKIT_API_KEY", "devkey")
        self.livekit_api_secret = os.getenv("LIVEKIT_API_SECRET", "secret")
        
        if not self.api_key or not self.face_id:
            logger.warning("Simli credentials not configured in .env")
        else:
            logger.info(f"✅ Simli initialized: face_id={self.face_id[:8]}..., livekit_url={self.livekit_url}")
    
    async def create_room_token(self, room_name: str, participant_name: str) -> str:
        """Generate LiveKit room token for client connection"""
        token = api.AccessToken(self.livekit_api_key, self.livekit_api_secret)
        token.with_identity(participant_name).with_name(participant_name)
        token.with_grants(api.VideoGrants(
            room_join=True,
            room=room_name,
        ))
        return token.to_jwt()
    
    async def create_interview_session(self, interview_id: str, candidate_name: str) -> dict:
        """
        Create a new Simli avatar interview session
        Returns connection details for the client
        """
        room_name = f"interview-{interview_id}"
        
        # Generate token for candidate
        candidate_token = await self.create_room_token(room_name, candidate_name)
        
        # Generate token for avatar agent
        agent_token = await self.create_room_token(room_name, "ai-interviewer")
        
        return {
            "room_name": room_name,
            "candidate_token": candidate_token,
            "agent_token": agent_token,
            "livekit_url": self.livekit_url,
            "simli_config": {
                "api_key": self.api_key,
                "face_id": self.face_id,
            }
        }
    
    async def speak_text(self, room_name: str, text: str):
        """Send text for the avatar to speak"""
        # This will be handled by the LiveKit agent
        # For now, we'll use a simple pub/sub mechanism
        logger.info(f"Avatar speaking in room {room_name}: {text[:50]}...")


# Global instance
simli_service = SimliAvatarService()
