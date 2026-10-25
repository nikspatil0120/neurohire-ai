"""
Simli Avatar Agent
This runs as a separate LiveKit agent process
Handles the avatar session and text-to-speech
Uses Google Gemini 2.5 Flash for natural conversations
"""
import logging
import os
import asyncio
from dotenv import load_dotenv
from livekit.agents import (
    Agent,
    AgentSession,
    JobContext,
    WorkerOptions,
    WorkerType,
    cli,
)
from livekit.plugins import google, simli

logger = logging.getLogger("simli-avatar-agent")
logger.setLevel(logging.INFO)

load_dotenv(override=True)


async def entrypoint(ctx: JobContext):
    """
    Entry point for the Simli avatar agent
    Called when a participant joins a room
    """
    logger.info(f"Agent joining room: {ctx.room.name}")
    
    # Create LLM session with Google Gemini 2.5 Flash
    session = AgentSession(
        llm=google.realtime.RealtimeModel(
            model="gemini-2.5-flash-native-audio-preview-12-2025",
            voice="Puck",  # Gemini voice
            temperature=0.8,
            instructions=(
                "You are an AI interviewer conducting a technical interview. "
                "Be professional, friendly, and ask relevant follow-up questions. "
                "Listen carefully to the candidate's responses and adapt your questions accordingly. "
                "Keep your responses concise and natural."
            ),
        ),
    )
    
    # Get Simli credentials from env
    simli_api_key = os.getenv("SIMLI_API_KEY")
    simli_face_id = os.getenv("SIMLI_FACE_ID")
    
    if not simli_api_key or not simli_face_id:
        logger.error("Simli credentials not configured!")
        return
    
    # Create Simli avatar session
    simli_avatar = simli.AvatarSession(
        simli_config=simli.SimliConfig(
            api_key=simli_api_key,
            face_id=simli_face_id,
        ),
    )
    
    # Start avatar
    await simli_avatar.start(session, room=ctx.room)
    logger.info("Simli avatar started")
    
    # Start the agent
    await session.start(
        agent=Agent(
            instructions=(
                "You are an AI interviewer. "
                "Start by greeting the candidate warmly. "
                "Ask about their background and experience. "
                "Ask relevant technical questions based on their responses. "
                "Be encouraging and professional."
            ),
        ),
        room=ctx.room,
    )
    
    logger.info("Agent session started successfully")


if __name__ == "__main__":
    # Run the LiveKit agent worker
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            worker_type=WorkerType.ROOM
        )
    )
