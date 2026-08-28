"""
AI Avatar Service for NeuroHire Interview System

This service integrates with LiveTalking/MuseTalk for real-time avatar generation.
It handles:
- Speech-to-Text (Whisper) for candidate responses
- Text-to-Speech (Kokoro/Piper) for AI questions
- Avatar video generation with lip-sync
- Real-time streaming via WebSocket
"""

import asyncio
import aiohttp
import json
import base64
from typing import AsyncGenerator, Optional, Dict, Any
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class AvatarService:
    """
    Service for managing AI avatar interactions during interviews
    """

    def __init__(
        self,
        avatar_service_url: str = "http://localhost:8001",
        enabled: bool = True,
    ):
        """
        Initialize Avatar Service

        Args:
            avatar_service_url: URL of LiveTalking/MuseTalk service
            enabled: Whether avatar service is enabled
        """
        self.avatar_service_url = avatar_service_url
        self.enabled = enabled
        self.session: Optional[aiohttp.ClientSession] = None
        self.active_connections: Dict[str, Any] = {}

        logger.info(f"AvatarService initialized (enabled={enabled})")

    async def connect(self):
        """Establish connection to avatar service"""
        if not self.enabled:
            logger.info("Avatar service is disabled")
            return

        if self.session is None:
            self.session = aiohttp.ClientSession()
            logger.info(f"Connected to avatar service at {self.avatar_service_url}")

    async def close(self):
        """Close avatar service connection"""
        if self.session:
            await self.session.close()
            self.session = None
            logger.info("Avatar service connection closed")

    async def health_check(self) -> bool:
        """
        Check if avatar service is available

        Returns:
            bool: True if service is healthy, False otherwise
        """
        if not self.enabled:
            return False

        try:
            await self.connect()
            async with self.session.get(
                f"{self.avatar_service_url}/health",
                timeout=aiohttp.ClientTimeout(total=5)
            ) as response:
                return response.status == 200
        except Exception as e:
            logger.warning(f"Avatar service health check failed: {e}")
            return False

    async def generate_avatar_speech(
        self,
        text: str,
        avatar_id: str = "default",
        voice_id: str = "default",
        stream: bool = True,
    ) -> AsyncGenerator[bytes, None]:
        """
        Generate avatar video with lip-sync for given text

        Args:
            text: Text for AI to speak
            avatar_id: ID of avatar to use
            voice_id: Voice model ID
            stream: Whether to stream response

        Yields:
            Video chunks with lip-synced avatar
        """
        if not self.enabled:
            logger.warning("Avatar service is disabled, skipping generation")
            return

        await self.connect()

        try:
            payload = {
                "text": text,
                "avatar": avatar_id,
                "voice": voice_id,
                "stream": stream,
            }

            async with self.session.post(
                f"{self.avatar_service_url}/api/generate",
                json=payload,
                timeout=aiohttp.ClientTimeout(total=60)
            ) as response:
                if response.status != 200:
                    logger.error(f"Avatar generation failed: {response.status}")
                    return

                async for chunk in response.content.iter_chunked(4096):
                    yield chunk

        except asyncio.TimeoutError:
            logger.error("Avatar generation timeout")
        except Exception as e:
            logger.error(f"Avatar generation error: {e}")

    async def transcribe_audio(
        self,
        audio_data: bytes,
        language: str = "en",
    ) -> Optional[str]:
        """
        Transcribe audio using Whisper STT

        Args:
            audio_data: Audio bytes (webm/opus format)
            language: Language code

        Returns:
            Transcribed text or None if failed
        """
        if not self.enabled:
            return None

        await self.connect()

        try:
            # Send audio to avatar service for transcription
            async with self.session.post(
                f"{self.avatar_service_url}/api/transcribe",
                data={"audio": audio_data, "language": language},
                timeout=aiohttp.ClientTimeout(total=30)
            ) as response:
                if response.status == 200:
                    result = await response.json()
                    return result.get("text")
                else:
                    logger.error(f"Transcription failed: {response.status}")
                    return None

        except Exception as e:
            logger.error(f"Transcription error: {e}")
            return None

    async def process_interview_interaction(
        self,
        audio_data: bytes,
        interview_context: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Process complete interview interaction:
        1. Transcribe candidate audio
        2. Generate AI response based on interview logic
        3. Generate avatar video for response

        Args:
            audio_data: Candidate's audio response
            interview_context: Context including question history, interview ID, etc.

        Returns:
            Dict with transcription, response text, and avatar video URL
        """
        result = {
            "timestamp": datetime.utcnow().isoformat(),
            "candidate_transcript": None,
            "ai_response": None,
            "avatar_video_ready": False,
            "error": None,
        }

        try:
            # Step 1: Transcribe candidate's response
            transcript = await self.transcribe_audio(audio_data)
            if not transcript:
                result["error"] = "Failed to transcribe audio"
                return result

            result["candidate_transcript"] = transcript
            logger.info(f"Candidate said: {transcript}")

            # Step 2: Generate AI response (integrate with your interview logic)
            # This is where you call your existing interview question generation
            ai_response = await self._generate_interview_response(
                transcript,
                interview_context
            )
            result["ai_response"] = ai_response

            # Step 3: Generate avatar video for AI response
            if self.enabled:
                # Trigger avatar generation (async, don't wait)
                asyncio.create_task(
                    self._cache_avatar_response(ai_response, interview_context)
                )
                result["avatar_video_ready"] = True

            return result

        except Exception as e:
            logger.error(f"Interview interaction error: {e}")
            result["error"] = str(e)
            return result

    async def _generate_interview_response(
        self,
        candidate_response: str,
        context: Dict[str, Any],
    ) -> str:
        """
        Generate AI interviewer response based on candidate's answer

        This is a placeholder - integrate with your existing interview logic

        Args:
            candidate_response: What candidate said
            context: Interview context

        Returns:
            AI's next question or feedback
        """
        # TODO: Integrate with your actual interview logic
        # For now, return a placeholder response

        responses = [
            "That's an interesting approach. Can you elaborate on the time complexity?",
            "Good explanation. How would you optimize this for large datasets?",
            "I see. What about edge cases? How would you handle them?",
            "Excellent. Now, let's move to the next question.",
            "Can you explain your thought process in more detail?",
        ]

        import random
        return random.choice(responses)

    async def _cache_avatar_response(
        self,
        text: str,
        context: Dict[str, Any],
    ):
        """
        Generate and cache avatar video for faster playback

        Args:
            text: Text to generate avatar for
            context: Interview context
        """
        try:
            video_chunks = []
            async for chunk in self.generate_avatar_speech(text):
                video_chunks.append(chunk)

            # Cache video chunks for this interview
            interview_id = context.get("interview_id")
            if interview_id:
                self.active_connections[interview_id] = {
                    "video": b"".join(video_chunks),
                    "text": text,
                    "timestamp": datetime.utcnow(),
                }
                logger.info(f"Cached avatar video for interview {interview_id}")

        except Exception as e:
            logger.error(f"Failed to cache avatar response: {e}")


# Singleton instance
_avatar_service: Optional[AvatarService] = None


def get_avatar_service() -> AvatarService:
    """Get or create avatar service singleton"""
    global _avatar_service
    if _avatar_service is None:
        try:
            from app.config import settings
        except ImportError:
            # Fallback if config module doesn't exist
            settings = None

        enabled = getattr(settings, "AVATAR_SERVICE_ENABLED", False) if settings else False
        url = getattr(settings, "AVATAR_SERVICE_URL", "http://localhost:8001") if settings else "http://localhost:8001"

        _avatar_service = AvatarService(
            avatar_service_url=url,
            enabled=enabled,
        )

    return _avatar_service


# Mock fallback when avatar service is not available
class MockAvatarService(AvatarService):
    """Mock avatar service for development/testing"""

    def __init__(self):
        super().__init__(enabled=False)
        logger.info("Using MockAvatarService (avatar features disabled)")

    async def health_check(self) -> bool:
        return False

    async def transcribe_audio(self, audio_data: bytes, language: str = "en") -> Optional[str]:
        # Simulate transcription
        return "This is a mock transcription for testing purposes."

    async def _generate_interview_response(
        self,
        candidate_response: str,
        context: Dict[str, Any],
    ) -> str:
        return "Thank you for your response. Let's move to the next question."
