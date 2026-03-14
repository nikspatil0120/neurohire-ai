from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException
from typing import Dict, List
import json
import logging
import asyncio
from datetime import datetime

from app.core.websocket_manager import WebSocketManager
from app.core.database import get_mongo_db
from app.ai.orchestrator import InterviewOrchestrator
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter()

# Initialize managers
websocket_manager = WebSocketManager()
orchestrator = InterviewOrchestrator()

@router.websocket("/ws/interview/{session_id}")
async def interview_websocket(websocket: WebSocket, session_id: str):
    """WebSocket endpoint for real-time interview"""
    
    await websocket_manager.connect(websocket, session_id)
    
    try:
        # Send initial connection confirmation
        await websocket_manager.send_personal_message({
            "type": "connection_established",
            "session_id": session_id,
            "timestamp": datetime.utcnow().isoformat()
        }, websocket)
        
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # Process different message types
            await process_interview_message(session_id, message, websocket)
            
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for session {session_id}")
        websocket_manager.disconnect(websocket, session_id)
    except Exception as e:
        logger.error(f"WebSocket error for session {session_id}: {e}")
        await websocket_manager.send_personal_message({
            "type": "error",
            "message": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }, websocket)

async def process_interview_message(session_id: str, message: Dict, websocket: WebSocket):
    """Process different types of interview messages"""
    
    message_type = message.get("type")
    
    try:
        if message_type == "audio_chunk":
            await handle_audio_chunk(session_id, message, websocket)
        
        elif message_type == "video_frame":
            await handle_video_frame(session_id, message, websocket)
        
        elif message_type == "candidate_response":
            await handle_candidate_response(session_id, message, websocket)
        
        elif message_type == "heartbeat":
            await websocket_manager.send_personal_message({
                "type": "heartbeat_ack",
                "timestamp": datetime.utcnow().isoformat()
            }, websocket)
        
        elif message_type == "session_status":
            await handle_session_status(session_id, message, websocket)
        
        else:
            logger.warning(f"Unknown message type: {message_type}")
            
    except Exception as e:
        logger.error(f"Error processing message type {message_type}: {e}")
        await websocket_manager.send_personal_message({
            "type": "error",
            "message": f"Error processing {message_type}: {str(e)}",
            "timestamp": datetime.utcnow().isoformat()
        }, websocket)

async def handle_audio_chunk(session_id: str, message: Dict, websocket: WebSocket):
    """Handle real-time audio processing"""
    
    audio_data = message.get("audio_data")  # Base64 encoded audio
    if not audio_data:
        return
    
    try:
        # Convert base64 to bytes
        import base64
        audio_bytes = base64.b64decode(audio_data)
        
        # Process with STT (this could be done in chunks for real-time)
        transcript_result = await orchestrator.stt.transcribe(audio_bytes)
        
        # Send real-time transcript update
        await websocket_manager.send_personal_message({
            "type": "transcript_update",
            "text": transcript_result.get("text", ""),
            "confidence": transcript_result.get("confidence", 0),
            "is_final": message.get("is_final", False),
            "timestamp": datetime.utcnow().isoformat()
        }, websocket)
        
        # Store in MongoDB if final
        if message.get("is_final", False):
            mongo_db = get_mongo_db()
            await mongo_db.interview_sessions.update_one(
                {"session_id": session_id},
                {
                    "$push": {
                        "audio_chunks": {
                            "timestamp": datetime.utcnow(),
                            "transcript": transcript_result,
                            "audio_duration": message.get("duration", 0)
                        }
                    }
                }
            )
        
    except Exception as e:
        logger.error(f"Error processing audio chunk: {e}")

async def handle_video_frame(session_id: str, message: Dict, websocket: WebSocket):
    """Handle real-time video frame analysis"""
    
    frame_data = message.get("frame_data")  # Base64 encoded image
    if not frame_data:
        return
    
    try:
        # Convert base64 to bytes
        import base64
        frame_bytes = base64.b64decode(frame_data.split(',')[1] if ',' in frame_data else frame_data)
        
        # Analyze emotion
        emotion_result = await orchestrator.emotion_detector.analyze_frame(frame_bytes)
        
        # Send real-time emotion update
        await websocket_manager.send_personal_message({
            "type": "emotion_update",
            "emotions": emotion_result.get("emotions", {}),
            "dominant_emotion": emotion_result.get("dominant_emotion", "neutral"),
            "confidence": emotion_result.get("confidence", 0),
            "face_detected": emotion_result.get("face_detected", False),
            "timestamp": datetime.utcnow().isoformat()
        }, websocket)
        
        # Store in MongoDB (sample every few frames to avoid overload)
        if message.get("store", False):
            mongo_db = get_mongo_db()
            await mongo_db.interview_sessions.update_one(
                {"session_id": session_id},
                {
                    "$push": {
                        "behavioral_metrics.emotion_history": {
                            "timestamp": datetime.utcnow(),
                            "emotions": emotion_result.get("emotions", {}),
                            "dominant_emotion": emotion_result.get("dominant_emotion", "neutral"),
                            "confidence": emotion_result.get("confidence", 0)
                        }
                    }
                }
            )
        
    except Exception as e:
        logger.error(f"Error processing video frame: {e}")

async def handle_candidate_response(session_id: str, message: Dict, websocket: WebSocket):
    """Handle complete candidate response and generate next question"""
    
    try:
        # Get current question from session
        mongo_db = get_mongo_db()
        session_data = await mongo_db.interview_sessions.find_one({"session_id": session_id})
        
        if not session_data:
            raise Exception("Session not found")
        
        current_question = session_data["questions"][-1] if session_data.get("questions") else {}
        
        # Process multimodal response
        audio_data = message.get("audio_data")
        video_frame = message.get("video_frame")
        
        audio_bytes = None
        video_bytes = None
        
        if audio_data:
            import base64
            audio_bytes = base64.b64decode(audio_data)
        
        if video_frame:
            import base64
            video_bytes = base64.b64decode(video_frame.split(',')[1] if ',' in video_frame else video_frame)
        
        # Process with AI orchestrator
        ai_response = await orchestrator.process_candidate_response(
            session_id,
            audio_bytes,
            video_bytes,
            current_question
        )
        
        # Store response in MongoDB
        response_data = {
            "timestamp": datetime.utcnow(),
            "transcript": ai_response.get("transcript", {}),
            "emotions": ai_response.get("emotions", {}),
            "voice_metrics": ai_response.get("voice_metrics", {}),
            "answer_score": ai_response.get("answer_score", {}),
            "question_answered": current_question
        }
        
        await mongo_db.interview_sessions.update_one(
            {"session_id": session_id},
            {
                "$push": {
                    "responses": response_data,
                    "behavioral_metrics.voice_analysis": ai_response.get("voice_metrics", {})
                }
            }
        )
        
        # Send response analysis to client
        await websocket_manager.send_personal_message({
            "type": "response_analyzed",
            "transcript": ai_response.get("transcript", {}),
            "emotions": ai_response.get("emotions", {}),
            "voice_metrics": ai_response.get("voice_metrics", {}),
            "answer_score": ai_response.get("answer_score", {}),
            "timestamp": datetime.utcnow().isoformat()
        }, websocket)
        
        # Send next question if available
        if ai_response.get("should_continue") and ai_response.get("next_question"):
            next_question = ai_response["next_question"]
            
            # Store next question
            await mongo_db.interview_sessions.update_one(
                {"session_id": session_id},
                {"$push": {"questions": next_question}}
            )
            
            await websocket_manager.send_personal_message({
                "type": "next_question",
                "question": next_question,
                "audio_url": ai_response.get("next_audio_url"),
                "timestamp": datetime.utcnow().isoformat()
            }, websocket)
        else:
            # Interview completed
            await websocket_manager.send_personal_message({
                "type": "interview_completed",
                "message": "Interview has been completed",
                "timestamp": datetime.utcnow().isoformat()
            }, websocket)
        
    except Exception as e:
        logger.error(f"Error handling candidate response: {e}")
        await websocket_manager.send_personal_message({
            "type": "error",
            "message": f"Error processing response: {str(e)}",
            "timestamp": datetime.utcnow().isoformat()
        }, websocket)

async def handle_session_status(session_id: str, message: Dict, websocket: WebSocket):
    """Handle session status requests"""
    
    try:
        mongo_db = get_mongo_db()
        session_data = await mongo_db.interview_sessions.find_one({"session_id": session_id})
        
        if session_data:
            status = {
                "session_id": session_id,
                "status": "active",
                "questions_asked": len(session_data.get("questions", [])),
                "responses_given": len(session_data.get("responses", [])),
                "started_at": session_data.get("started_at"),
                "last_activity": datetime.utcnow().isoformat()
            }
        else:
            status = {
                "session_id": session_id,
                "status": "not_found",
                "error": "Session not found"
            }
        
        await websocket_manager.send_personal_message({
            "type": "session_status",
            "data": status,
            "timestamp": datetime.utcnow().isoformat()
        }, websocket)
        
    except Exception as e:
        logger.error(f"Error getting session status: {e}")
        await websocket_manager.send_personal_message({
            "type": "error",
            "message": f"Error getting session status: {str(e)}",
            "timestamp": datetime.utcnow().isoformat()
        }, websocket)