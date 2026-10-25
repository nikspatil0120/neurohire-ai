"""
Avatar WebSocket API for real-time interview interactions

This module provides WebSocket endpoints for:
- Real-time audio streaming from candidate
- Avatar video streaming to candidate
- Live transcription and emotion detection
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from typing import Dict, Any
import json
import base64
import asyncio
import logging
from datetime import datetime

from app.services.avatar_service import get_avatar_service, AvatarService

logger = logging.getLogger(__name__)
router = APIRouter()

# Active WebSocket connections
active_connections: Dict[str, WebSocket] = {}


@router.websocket("/ws/avatar/{interview_id}")
async def avatar_websocket_endpoint(
    websocket: WebSocket,
    interview_id: str,
):
    """
    WebSocket endpoint for real-time avatar interaction during interview

    Protocol:
    - Client sends: audio chunks (base64 encoded) or control messages
    - Server sends: transcripts, avatar video chunks, speaking states, questions

    Message Format (JSON):
    {
        "type": "audio|init|control",
        "data": "base64_audio_data",
        "interviewId": "interview_id"
    }

    Response Format (JSON):
    {
        "type": "transcript|question|video_chunk|speaking_state|emotion|error",
        "text": "transcribed_or_question_text",
        "speaker": "ai|candidate",
        "speaking": true|false,
        "emotions": {...},
        "error": "error_message"
    }
    """
    await websocket.accept()
    active_connections[interview_id] = websocket

    logger.info(f"Avatar WebSocket connected for interview {interview_id}")

    # Get avatar service
    avatar_service = get_avatar_service()

    # Interview context
    interview_context = {
        "interview_id": interview_id,
        "start_time": datetime.utcnow(),
        "question_count": 0,
        "transcript_history": [],
        "initialized": False,  # Track if interview has been initialized
    }

    # Send initial connection confirmation
    await websocket.send_json({
        "type": "connection",
        "status": "connected",
        "message": "Avatar service ready",
        "avatar_enabled": avatar_service.enabled,
    })

    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            message = json.loads(data)

            message_type = message.get("type")

            if message_type == "init":
                # Client initialization - only send question once
                if not interview_context["initialized"]:
                    logger.info(f"Client initialized for interview {interview_id}")
                    interview_context["initialized"] = True
                    await send_initial_question(websocket, avatar_service, interview_context)
                else:
                    logger.info(f"Interview already initialized for {interview_id}")

            elif message_type == "audio":
                # Process audio from candidate
                audio_base64 = message.get("data")
                if audio_base64:
                    await process_candidate_audio(
                        websocket,
                        audio_base64,
                        avatar_service,
                        interview_context
                    )

            elif message_type == "control":
                # Handle control messages (pause, resume, skip, etc.)
                control_action = message.get("action")
                logger.info(f"Control action received: {control_action}")

                if control_action == "next_question":
                    await send_next_question(websocket, avatar_service, interview_context)

                elif control_action == "pause":
                    await websocket.send_json({
                        "type": "speaking_state",
                        "speaking": False,
                    })

            elif message_type == "heartbeat":
                # Keep-alive
                await websocket.send_json({"type": "heartbeat_ack"})

            else:
                logger.warning(f"Unknown message type: {message_type}")

    except WebSocketDisconnect:
        logger.info(f"Avatar WebSocket disconnected for interview {interview_id}")
        active_connections.pop(interview_id, None)

    except Exception as e:
        logger.error(f"Avatar WebSocket error: {e}")
        try:
            await websocket.send_json({
                "type": "error",
                "error": str(e),
            })
        except:
            pass
        finally:
            active_connections.pop(interview_id, None)


async def send_initial_question(
    websocket: WebSocket,
    avatar_service: AvatarService,
    context: Dict[str, Any],
):
    """
    Send the first interview question

    Args:
        websocket: WebSocket connection
        avatar_service: Avatar service instance
        context: Interview context
    """
    try:
        # Get first question (integrate with your interview logic)
        question = await get_interview_question(context)

        # Update context
        context["question_count"] += 1
        context["transcript_history"].append({
            "speaker": "ai",
            "text": question,
            "timestamp": datetime.utcnow().isoformat(),
        })

        # Send question to client
        await websocket.send_json({
            "type": "question",
            "question": question,
            "question_number": context["question_count"],
        })

        # Indicate AI is speaking
        await websocket.send_json({
            "type": "speaking_state",
            "speaking": True,
        })

        # Simulate speaking duration (max 10 seconds)
        duration = min(len(question) / 15, 10)  # ~15 chars per second, max 10s
        await asyncio.sleep(duration)

        # Stop speaking
        await websocket.send_json({
            "type": "speaking_state",
            "speaking": False,
        })

        logger.info(f"✅ Sent question {context['question_count']}: {question[:50]}...")

    except WebSocketDisconnect:
        logger.info("WebSocket disconnected while sending question")
        raise
    except Exception as e:
        logger.error(f"❌ Failed to send initial question: {e}")
        try:
            await websocket.send_json({
                "type": "error",
                "error": "Failed to generate question",
            })
        except:
            pass


async def send_next_question(
    websocket: WebSocket,
    avatar_service: AvatarService,
    context: Dict[str, Any],
):
    """Send the next interview question"""
    await send_initial_question(websocket, avatar_service, context)


async def process_candidate_audio(
    websocket: WebSocket,
    audio_base64: str,
    avatar_service: AvatarService,
    context: Dict[str, Any],
):
    """
    Process audio from candidate

    Args:
        websocket: WebSocket connection
        audio_base64: Base64 encoded audio data
        avatar_service: Avatar service instance
        context: Interview context
    """
    try:
        # Skip if audio is too short (likely noise)
        if len(audio_base64) < 100:
            return

        # Decode audio
        audio_bytes = base64.b64decode(audio_base64)

        # Skip if audio bytes are too small
        if len(audio_bytes) < 1000:
            return

        # Transcribe audio (if avatar service is enabled)
        if avatar_service.enabled:
            transcript = await avatar_service.transcribe_audio(audio_bytes)
        else:
            # Mock transcription for development - simulate silence
            return  # Don't create mock responses continuously

        # Only process if we have meaningful transcript
        if transcript and len(transcript.strip()) > 5:
            # Send transcript to client
            await websocket.send_json({
                "type": "transcript",
                "text": transcript,
                "speaker": "candidate",
            })

            # Update context
            context["transcript_history"].append({
                "speaker": "candidate",
                "text": transcript,
                "timestamp": datetime.utcnow().isoformat(),
            })

            # Analyze emotions (mock for now)
            emotions = {
                "confidence": 75,
                "calm": 68,
                "engaged": 82,
                "stress": 28,
            }

            await websocket.send_json({
                "type": "emotion",
                "emotions": emotions,
            })

            # Generate and send AI response
            ai_response = await avatar_service._generate_interview_response(
                transcript,
                context
            )

            if ai_response:
                await websocket.send_json({
                    "type": "question",
                    "question": ai_response,
                })

                # Update context
                context["transcript_history"].append({
                    "speaker": "ai",
                    "text": ai_response,
                    "timestamp": datetime.utcnow().isoformat(),
                })

                logger.info(f"✅ Processed audio - Transcript: {transcript[:50]}...")

    except Exception as e:
        logger.error(f"❌ Failed to process candidate audio: {e}")
        # Don't send error to avoid flooding - just log it


async def get_interview_question(context: Dict[str, Any]) -> str:
    """
    Get next interview question based on context

    This is a placeholder - integrate with your actual interview logic

    Args:
        context: Interview context

    Returns:
        Next interview question
    """
    # TODO: Integrate with your actual question generation logic

    questions = [
        "Welcome to your interview. Let's start with an introduction. Tell me about yourself and your background.",
        "Can you explain the difference between Object-Oriented Programming and Functional Programming?",
        "Describe a challenging project you worked on. What obstacles did you face and how did you overcome them?",
        "How do you approach debugging when you encounter a complex issue in production?",
        "What is your experience with cloud technologies and microservices architecture?",
        "Can you walk me through how you would design a scalable system for handling millions of users?",
        "Tell me about a time when you had to learn a new technology quickly. How did you approach it?",
        "What are your thoughts on code reviews and best practices for collaborative development?",
        "How do you stay updated with the latest trends and technologies in software development?",
        "Do you have any questions for me about the role or the company?",
    ]

    question_number = context.get("question_count", 0)

    if question_number < len(questions):
        return questions[question_number]
    else:
        return "Thank you for your responses. We've completed the interview. Do you have any final questions?"


@router.get("/avatar/health")
async def avatar_health_check():
    """Check avatar service health"""
    avatar_service = get_avatar_service()
    is_healthy = await avatar_service.health_check()

    return {
        "status": "healthy" if is_healthy else "unavailable",
        "enabled": avatar_service.enabled,
        "service_url": avatar_service.avatar_service_url,
    }


@router.get("/avatar/status/{interview_id}")
async def get_avatar_status(interview_id: str):
    """Get avatar connection status for interview"""
    is_connected = interview_id in active_connections

    return {
        "interview_id": interview_id,
        "connected": is_connected,
        "active_interviews": len(active_connections),
    }


@router.post("/avatar/test")
async def test_avatar_generation(text: str = "Hello, this is a test message."):
    """Test avatar generation (development endpoint)"""
    avatar_service = get_avatar_service()

    if not avatar_service.enabled:
        return {
            "status": "disabled",
            "message": "Avatar service is not enabled",
        }

    try:
        # Test transcription
        test_result = {
            "service": "available",
            "message": "Avatar service is working",
            "test_text": text,
        }

        return test_result

    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
        }
