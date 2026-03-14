# WebSocket Real-time Implementation

## 🔌 WebSocket Manager

```python
# app/core/websocket_manager.py
from fastapi import WebSocket
from typing import Dict, List
import json
import asyncio
import uuid

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.session_data: Dict[str, Dict] = {}
    
    async def connect(self, websocket: WebSocket, session_id: str):
        """Accept WebSocket connection"""
        await websocket.accept()
        self.active_connections[session_id] = websocket
        self.session_data[session_id] = {
            "connected_at": asyncio.get_event_loop().time(),
            "last_activity": asyncio.get_event_loop().time()
        }
    
    def disconnect(self, session_id: str):
        """Remove connection"""
        if session_id in self.active_connections:
            del self.active_connections[session_id]
        if session_id in self.session_data:
            del self.session_data[session_id]
    
    async def send_personal_message(self, message: dict, session_id: str):
        """Send message to specific session"""
        if session_id in self.active_connections:
            websocket = self.active_connections[session_id]
            try:
                await websocket.send_text(json.dumps(message))
                self.session_data[session_id]["last_activity"] = asyncio.get_event_loop().time()
            except Exception as e:
                print(f"Error sending message to {session_id}: {e}")
                self.disconnect(session_id)
    
    async def broadcast(self, message: dict):
        """Broadcast message to all connections"""
        disconnected = []
        for session_id, websocket in self.active_connections.items():
            try:
                await websocket.send_text(json.dumps(message))
            except Exception as e:
                print(f"Error broadcasting to {session_id}: {e}")
                disconnected.append(session_id)
        
        # Clean up disconnected sessions
        for session_id in disconnected:
            self.disconnect(session_id)
    
    def get_active_sessions(self) -> List[str]:
        """Get list of active session IDs"""
        return list(self.active_connections.keys())

# Global connection manager instance
manager = ConnectionManager()
```

## 🎯 WebSocket Interview Handler

```python
# app/api/websocket.py
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from app.core.websocket_manager import manager
from app.ai.orchestrator import InterviewOrchestrator
from app.services.interview_service import InterviewService
import json
import asyncio
import base64

router = APIRouter()

@router.websocket("/ws/interview/{session_id}")
async def websocket_interview_endpoint(
    websocket: WebSocket, 
    session_id: str,
    interview_service: InterviewService = Depends()
):
    """Main WebSocket endpoint for live interviews"""
    
    # Initialize AI orchestrator
    orchestrator = InterviewOrchestrator()
    
    await manager.connect(websocket, session_id)
    
    try:
        # Get interview data
        interview_data = await interview_service.get_interview_by_session(session_id)
        if not interview_data:
            await manager.send_personal_message({
                "type": "error",
                "message": "Invalid session"
            }, session_id)
            return
        
        # Start interview
        initial_response = await orchestrator.start_interview(
            session_id, 
            interview_data["job"]
        )
        
        await manager.send_personal_message({
            "type": "interview_started",
            "question": initial_response["question"],
            "audio_url": initial_response["audio_url"]
        }, session_id)
        
        # Main message loop
        current_question = initial_response["question"]
        audio_buffer = b""
        video_frame = None
        
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            message = json.loads(data)
            
            await handle_client_message(
                message, 
                session_id, 
                orchestrator,
                current_question,
                interview_service
            )
            
    except WebSocketDisconnect:
        manager.disconnect(session_id)
        await interview_service.mark_interview_disconnected(session_id)
    except Exception as e:
        print(f"WebSocket error: {e}")
        await manager.send_personal_message({
            "type": "error",
            "message": "Internal server error"
        }, session_id)
        manager.disconnect(session_id)

async def handle_client_message(
    message: dict,
    session_id: str,
    orchestrator: InterviewOrchestrator,
    current_question: dict,
    interview_service: InterviewService
):
    """Handle different types of client messages"""
    
    message_type = message.get("type")
    
    if message_type == "audio_chunk":
        await handle_audio_chunk(message, session_id, orchestrator)
        
    elif message_type == "video_frame":
        await handle_video_frame(message, session_id, orchestrator)
        
    elif message_type == "answer_complete":
        await handle_answer_complete(
            message, session_id, orchestrator, current_question, interview_service
        )
        
    elif message_type == "heartbeat":
        await manager.send_personal_message({
            "type": "heartbeat_ack",
            "timestamp": message.get("timestamp")
        }, session_id)

async def handle_audio_chunk(
    message: dict, 
    session_id: str, 
    orchestrator: InterviewOrchestrator
):
    """Process audio chunk for real-time transcription"""
    try:
        audio_data = base64.b64decode(message["data"])
        
        # Real-time transcription
        transcript = await orchestrator.stt.transcribe(audio_data)
        
        if transcript["text"]:
            await manager.send_personal_message({
                "type": "transcript",
                "text": transcript["text"],
                "confidence": transcript["confidence"],
                "is_final": message.get("is_final", False),
                "timestamp": message.get("timestamp")
            }, session_id)
        
        # Voice analysis
        voice_metrics = await orchestrator.voice_analyzer.analyze_audio(audio_data)
        
        await manager.send_personal_message({
            "type": "voice_analysis",
            "confidence": voice_metrics.get("confidence", 0),
            "speech_rate": voice_metrics.get("speech_rate", 0),
            "pitch_stability": voice_metrics.get("pitch_stability", 0),
            "timestamp": message.get("timestamp")
        }, session_id)
        
    except Exception as e:
        print(f"Audio processing error: {e}")

async def handle_video_frame(
    message: dict,
    session_id: str, 
    orchestrator: InterviewOrchestrator
):
    """Process video frame for emotion analysis"""
    try:
        frame_data = message["data"]
        
        # Emotion analysis
        emotion_result = await orchestrator.emotion_detector.analyze_frame(frame_data)
        
        if emotion_result.get("face_detected"):
            await manager.send_personal_message({
                "type": "emotion_analysis",
                "emotions": emotion_result["emotions"],
                "face_detected": True,
                "dominant_emotion": emotion_result.get("dominant_emotion"),
                "timestamp": message.get("timestamp")
            }, session_id)
        else:
            await manager.send_personal_message({
                "type": "emotion_analysis",
                "face_detected": False,
                "timestamp": message.get("timestamp")
            }, session_id)
            
    except Exception as e:
        print(f"Video processing error: {e}")

async def handle_answer_complete(
    message: dict,
    session_id: str,
    orchestrator: InterviewOrchestrator,
    current_question: dict,
    interview_service: InterviewService
):
    """Handle when candidate completes an answer"""
    try:
        # Get accumulated transcript for this question
        full_answer = await interview_service.get_question_transcript(
            session_id, 
            current_question["id"]
        )
        
        # Process complete response
        response = await orchestrator.process_candidate_response(
            session_id,
            b"",  # Audio already processed in chunks
            b"",  # Video already processed in frames  
            current_question
        )
        
        # Send answer evaluation
        await manager.send_personal_message({
            "type": "answer_evaluated",
            "score": response["answer_score"]["score"],
            "feedback": response["answer_score"]["feedback"],
            "timestamp": message.get("timestamp")
        }, session_id)
        
        # Send next question or end interview
        if response["should_continue"] and response["next_question"]:
            await manager.send_personal_message({
                "type": "next_question",
                "question": response["next_question"],
                "audio_url": response["next_audio_url"],
                "progress": {
                    "current": message.get("question_number", 1) + 1,
                    "total": 10
                }
            }, session_id)
        else:
            # Interview complete
            await manager.send_personal_message({
                "type": "interview_complete",
                "final_score": response.get("final_score", 0),
                "message": "Interview completed successfully"
            }, session_id)
            
            # Generate final report
            await interview_service.generate_final_report(session_id)
            
    except Exception as e:
        print(f"Answer processing error: {e}")
```

## 🚨 Security & Monitoring

```python
# app/api/websocket_security.py
from fastapi import WebSocket, HTTPException, Depends
from app.core.security import verify_token
import time

class WebSocketSecurity:
    def __init__(self):
        self.connection_limits = {}
        self.suspicious_activity = {}
    
    async def authenticate_websocket(self, websocket: WebSocket, token: str):
        """Authenticate WebSocket connection"""
        try:
            user_data = verify_token(token)
            return user_data
        except Exception:
            await websocket.close(code=4001, reason="Authentication failed")
            return None
    
    def check_rate_limit(self, session_id: str, message_type: str) -> bool:
        """Check if client is sending too many messages"""
        current_time = time.time()
        
        if session_id not in self.connection_limits:
            self.connection_limits[session_id] = {}
        
        limits = self.connection_limits[session_id]
        
        # Different limits for different message types
        rate_limits = {
            "audio_chunk": 50,  # per second
            "video_frame": 30,  # per second
            "heartbeat": 1,     # per second
            "answer_complete": 0.1  # per 10 seconds
        }
        
        limit = rate_limits.get(message_type, 10)
        
        if message_type not in limits:
            limits[message_type] = []
        
        # Clean old timestamps
        limits[message_type] = [
            ts for ts in limits[message_type] 
            if current_time - ts < 1.0
        ]
        
        # Check limit
        if len(limits[message_type]) >= limit:
            return False
        
        limits[message_type].append(current_time)
        return True
    
    def detect_suspicious_activity(self, session_id: str, message: dict) -> bool:
        """Detect suspicious patterns"""
        current_time = time.time()
        
        if session_id not in self.suspicious_activity:
            self.suspicious_activity[session_id] = {
                "tab_switches": 0,
                "face_lost_count": 0,
                "last_face_detection": current_time
            }
        
        activity = self.suspicious_activity[session_id]
        
        # Check for tab switching (client-side detection)
        if message.get("type") == "tab_switch_detected":
            activity["tab_switches"] += 1
            if activity["tab_switches"] >= 3:
                return True  # Terminate interview
        
        # Check for face detection loss
        if message.get("type") == "video_frame":
            if not message.get("face_detected", True):
                if current_time - activity["last_face_detection"] > 10:
                    activity["face_lost_count"] += 1
                    if activity["face_lost_count"] >= 3:
                        return True
            else:
                activity["last_face_detection"] = current_time
                activity["face_lost_count"] = 0
        
        return False

# Global security instance
websocket_security = WebSocketSecurity()
```

## 📊 Real-time Analytics

```python
# app/services/realtime_analytics.py
import asyncio
from typing import Dict, List
from app.core.websocket_manager import manager
import json

class RealtimeAnalytics:
    def __init__(self):
        self.session_metrics = {}
        self.running = False
    
    async def start_analytics_loop(self):
        """Start background analytics processing"""
        self.running = True
        while self.running:
            await self.process_analytics()
            await asyncio.sleep(5)  # Process every 5 seconds
    
    async def process_analytics(self):
        """Process and broadcast analytics updates"""
        active_sessions = manager.get_active_sessions()
        
        for session_id in active_sessions:
            metrics = await self.calculate_session_metrics(session_id)
            
            await manager.send_personal_message({
                "type": "analytics_update",
                "metrics": metrics,
                "timestamp": asyncio.get_event_loop().time()
            }, session_id)
    
    async def calculate_session_metrics(self, session_id: str) -> Dict:
        """Calculate real-time metrics for session"""
        # This would integrate with your data storage
        # For now, return mock metrics
        return {
            "interview_duration": 1245,  # seconds
            "questions_answered": 3,
            "average_response_time": 45,  # seconds
            "current_confidence": 78,
            "technical_score_trend": [65, 72, 78],
            "engagement_level": 82
        }
    
    def stop_analytics(self):
        """Stop analytics processing"""
        self.running = False

# Global analytics instance
analytics = RealtimeAnalytics()
```