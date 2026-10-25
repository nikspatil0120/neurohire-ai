# 🎭 AI Avatar Integration Plan - NeuroHire Interview System

## Overview
Integrate **LiveTalking + MuseTalk** avatar system into the NeuroHire AI interview platform to create an interactive AI interviewer with real-time lip-sync and voice interaction.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │          Interview Room Component                     │  │
│  │  ┌────────────┐      ┌────────────┐                  │  │
│  │  │   Video    │      │  Candidate │                  │  │
│  │  │   Avatar   │      │   Camera   │                  │  │
│  │  │  Player    │      │   Feed     │                  │  │
│  │  └────────────┘      └────────────┘                  │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │        WebSocket Connection                     │  │  │
│  │  │   (Audio Stream + Control Messages)            │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              Backend (FastAPI + Node.js)                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Interview Logic Service                       │  │
│  │  • Question Generation (Your existing logic)          │  │
│  │  • Answer Evaluation                                  │  │
│  │  • Progress Tracking                                  │  │
│  └──────────────────────────────────────────────────────┘  │
│                        │                                    │
│                        ▼                                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Avatar Pipeline Service                       │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐     │  │
│  │  │   Whisper  │→ │   Your     │→ │   TTS      │     │  │
│  │  │    STT     │  │   LLM      │  │  (Kokoro/  │     │  │
│  │  │            │  │  Response  │  │   Piper)   │     │  │
│  │  └────────────┘  └────────────┘  └────────────┘     │  │
│  │         │                              │              │  │
│  │         ▼                              ▼              │  │
│  │  ┌──────────────────────────────────────────┐       │  │
│  │  │      LiveTalking + MuseTalk              │       │  │
│  │  │  • Real-time lip-sync                    │       │  │
│  │  │  • Avatar video generation               │       │  │
│  │  │  • Streaming output                      │       │  │
│  │  └──────────────────────────────────────────┘       │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 📋 Implementation Phases

### Phase 1: Local GPU Setup (Recommended)
**Requirements:**
- NVIDIA GPU with 8GB+ VRAM (12GB+ recommended)
- CUDA installed
- Python 3.10+

**Steps:**
1. Clone and setup LiveTalking repository
2. Install dependencies (PyTorch, MuseTalk, etc.)
3. Create API endpoint for avatar generation
4. Test with sample audio

### Phase 2: Cloud GPU Alternative (If no local GPU)
**Options:**
- Google Colab with GPU runtime
- AWS EC2 with GPU instance
- RunPod GPU rental
- Vast.ai GPU rental

### Phase 3: Frontend Integration
1. Create Avatar component in React
2. Implement WebSocket connection for real-time streaming
3. Add audio capture from candidate's microphone
4. Display avatar video with lip-sync

### Phase 4: Backend Integration
1. Connect existing interview logic to avatar pipeline
2. Implement question-to-speech conversion
3. Add response streaming
4. Handle interruptions

## 🚀 Quick Start - Option 1: LiveTalking (BEST FOR YOUR PROJECT)

### 1. Clone LiveTalking Repository
```bash
cd neurohire-ai
git clone https://github.com/lipku/LiveTalking.git avatar-service
cd avatar-service
```

### 2. Install Dependencies
```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install requirements
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
pip install -r requirements.txt
```

### 3. Download Models
```bash
# MuseTalk models
mkdir -p models/musetalk
# Download from: https://github.com/TMElyralab/MuseTalk

# TTS models (if using Piper)
mkdir -p models/tts
```

### 4. Create Avatar Asset
You need:
- A photo or short video of a person (to be the AI interviewer avatar)
- Can be generated or use stock images
- Recommended: Professional-looking business person

### 5. Run LiveTalking Server
```bash
python app.py --mode musetalk --port 8001
```

## 🚀 Quick Start - Option 2: MuseTalk LiveKit (Simpler)

### 1. Clone MuseTalk LiveKit
```bash
cd neurohire-ai
git clone https://github.com/plutus123/Livekit_MuseTalk_Avatar.git avatar-service
cd avatar-service
```

### 2. Setup
```bash
pip install -r requirements.txt
```

### 3. Configure
Edit `config.yaml`:
```yaml
interview_mode: true
avatar_image: "assets/interviewer.jpg"
voice_model: "kokoro-tts"  # or piper-tts
```

### 4. Run
```bash
python run.py
```

## 🔌 Integration Code Examples

### Frontend: Avatar Component

Create `src/components/AIAvatarInterviewer.tsx`:

```typescript
import { useEffect, useRef, useState } from 'react';
import { Brain, Mic, Volume2 } from 'lucide-react';

interface AIAvatarInterviewerProps {
  onTranscript?: (text: string, speaker: 'ai' | 'candidate') => void;
  onEmotionUpdate?: (emotions: any) => void;
}

export const AIAvatarInterviewer = ({ 
  onTranscript, 
  onEmotionUpdate 
}: AIAvatarInterviewerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Connect to avatar service
    const ws = new WebSocket('ws://localhost:8001/avatar');
    
    ws.onopen = () => {
      console.log('Avatar service connected');
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'video_chunk') {
        // Stream video to player
        if (videoRef.current) {
          // Handle video streaming
        }
      } else if (data.type === 'transcript') {
        onTranscript?.(data.text, data.speaker);
      } else if (data.type === 'speaking_state') {
        setIsSpeaking(data.speaking);
      }
    };

    wsRef.current = ws;

    return () => {
      ws.close();
    };
  }, []);

  const startMicrophone = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true 
      });
      
      const mediaRecorder = new MediaRecorder(stream);
      
      mediaRecorder.ondataavailable = (event) => {
        if (wsRef.current && event.data.size > 0) {
          // Send audio to avatar service
          wsRef.current.send(event.data);
        }
      };

      mediaRecorder.start(100); // Send chunks every 100ms
    } catch (error) {
      console.error('Microphone access denied:', error);
    }
  };

  return (
    <div className="relative w-full h-full rounded-lg overflow-hidden">
      {/* Avatar Video */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-full object-cover"
      />

      {/* Status Overlay */}
      <div className="absolute bottom-4 left-4 flex items-center gap-2 glass-panel px-3 py-2">
        <Brain className={`w-4 h-4 ${isConnected ? 'text-primary' : 'text-muted-foreground'}`} />
        <span className="text-xs text-foreground">
          {isConnected ? 'AI Interviewer Active' : 'Connecting...'}
        </span>
        {isSpeaking && (
          <Volume2 className="w-4 h-4 text-primary animate-glow-pulse" />
        )}
      </div>

      {/* Connection Status Indicator */}
      <div className="absolute top-4 right-4">
        <div className={`w-2 h-2 rounded-full ${
          isConnected ? 'bg-primary' : 'bg-destructive'
        } animate-glow-pulse`} />
      </div>
    </div>
  );
};
```

### Backend: Avatar Service Integration

Create `backend/app/services/avatar_service.py`:

```python
import asyncio
import aiohttp
from fastapi import WebSocket
from typing import AsyncGenerator
import json

class AvatarService:
    def __init__(self, avatar_url: str = "http://localhost:8001"):
        self.avatar_url = avatar_url
        self.session = None
    
    async def connect(self):
        """Connect to LiveTalking avatar service"""
        self.session = aiohttp.ClientSession()
    
    async def generate_avatar_response(
        self, 
        text: str, 
        avatar_id: str = "default"
    ) -> AsyncGenerator[bytes, None]:
        """
        Stream avatar video with lip-sync for given text
        
        Args:
            text: Text for AI to speak
            avatar_id: ID of avatar to use
            
        Yields:
            Video chunks with lip-synced avatar
        """
        if not self.session:
            await self.connect()
        
        async with self.session.post(
            f"{self.avatar_url}/generate",
            json={
                "text": text,
                "avatar": avatar_id,
                "voice": "default",
                "stream": True
            }
        ) as response:
            async for chunk in response.content.iter_chunked(4096):
                yield chunk
    
    async def process_audio_stream(
        self, 
        audio_stream: AsyncGenerator[bytes, None]
    ) -> AsyncGenerator[dict, None]:
        """
        Process audio stream and return transcription + avatar response
        
        Args:
            audio_stream: Stream of audio bytes from candidate
            
        Yields:
            Dicts with transcription and avatar video chunks
        """
        if not self.session:
            await self.connect()
        
        async with self.session.ws_connect(
            f"{self.avatar_url}/stream"
        ) as ws:
            async for audio_chunk in audio_stream:
                await ws.send_bytes(audio_chunk)
                
                response = await ws.receive_json()
                yield response
    
    async def close(self):
        """Close avatar service connection"""
        if self.session:
            await self.session.close()

# WebSocket endpoint for real-time avatar interaction
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter()
avatar_service = AvatarService()

@router.websocket("/ws/avatar/{interview_id}")
async def avatar_websocket(
    websocket: WebSocket, 
    interview_id: str
):
    await websocket.accept()
    await avatar_service.connect()
    
    try:
        while True:
            # Receive audio from candidate
            audio_data = await websocket.receive_bytes()
            
            # Process through your interview logic
            # ... (your existing question generation logic)
            
            # Generate avatar response
            response_text = "Can you explain your approach to this problem?"
            
            # Stream avatar video back
            async for video_chunk in avatar_service.generate_avatar_response(
                response_text
            ):
                await websocket.send_bytes(video_chunk)
                
    except WebSocketDisconnect:
        await avatar_service.close()
```

### Integration with Existing Interview Logic

Update `backend/app/api/interviews.py`:

```python
from app.services.avatar_service import AvatarService, router as avatar_router
from fastapi import APIRouter

# Add avatar router
router = APIRouter()
router.include_router(avatar_router, prefix="/avatar", tags=["avatar"])

# Update existing interview endpoint to support avatar
@router.post("/interviews/{interview_id}/ask-question")
async def ask_question_with_avatar(
    interview_id: str,
    enable_avatar: bool = True
):
    # Your existing logic
    question = generate_next_question(interview_id)
    
    if enable_avatar:
        avatar_service = AvatarService()
        # Return question with avatar video URL
        return {
            "question": question,
            "avatar_enabled": True,
            "avatar_video_url": f"/api/avatar/stream/{interview_id}"
        }
    
    return {"question": question, "avatar_enabled": False}
```

## 🎨 UI Updates

Update `src/pages/candidate/InterviewRoom.tsx`:

```typescript
import { AIAvatarInterviewer } from "@/components/AIAvatarInterviewer";

// Replace the existing AI Avatar section with:
<GlassCard variant="neon" hover={false} className="aspect-video relative scan-line">
  <AIAvatarInterviewer 
    onTranscript={(text, speaker) => {
      // Update transcript in state
      setTranscript(prev => [...prev, { text, speaker }]);
    }}
    onEmotionUpdate={(emotions) => {
      // Update emotion metrics
      setEmotionMetrics(emotions);
    }}
  />
</GlassCard>
```

## 📦 Required Packages

### Backend Additional Dependencies
```bash
cd backend
pip install aiohttp websockets opencv-python-headless
```

### Frontend Additional Dependencies
```bash
npm install @mediapipe/tasks-vision
```

## ⚙️ Configuration

### Environment Variables

Add to `backend/.env`:
```env
# Avatar Service
AVATAR_SERVICE_URL=http://localhost:8001
AVATAR_SERVICE_ENABLED=true
AVATAR_MODEL_PATH=./models/musetalk
TTS_MODEL=kokoro  # or piper

# GPU Settings
CUDA_VISIBLE_DEVICES=0
AVATAR_BATCH_SIZE=1
```

Add to `.env`:
```env
# Frontend Avatar Configuration
VITE_AVATAR_WS_URL=ws://localhost:8000/api/ws/avatar
VITE_AVATAR_ENABLED=true
```

## 🧪 Testing Strategy

### 1. Test Avatar Service Standalone
```bash
cd avatar-service
python test_avatar.py --text "Hello, welcome to your interview"
```

### 2. Test WebSocket Connection
```bash
# Use websocat or similar tool
websocat ws://localhost:8001/avatar
```

### 3. Test End-to-End
1. Start avatar service: `python app.py`
2. Start backend: `uvicorn app.main:app`
3. Start frontend: `npm run dev`
4. Navigate to interview room
5. Speak into microphone
6. Verify avatar responds with lip-sync

## 📊 Performance Optimization

### GPU Optimization
- Use FP16 precision for faster inference
- Batch processing when possible
- Pre-load models at startup

### Streaming Optimization
- Use WebRTC instead of WebSocket for lower latency
- Implement video chunk caching
- Compress video streams

### Cost-Effective Alternatives
If GPU is not available:
1. **Pre-rendered Responses**: Generate common question videos in advance
2. **Cloud GPU on-demand**: Use RunPod/Vast.ai only during interviews
3. **Simplified Avatar**: Use 2D animated avatar with audio

## 🎯 Next Steps

1. **Choose Your GPU Option**:
   - [ ] Local GPU
   - [ ] Google Colab
   - [ ] Cloud GPU rental

2. **Setup Avatar Service**:
   - [ ] Clone repository
   - [ ] Install dependencies
   - [ ] Test with sample

3. **Create Avatar Asset**:
   - [ ] Choose/create interviewer image
   - [ ] Test avatar generation

4. **Backend Integration**:
   - [ ] Create avatar service module
   - [ ] Add WebSocket endpoints
   - [ ] Connect to interview logic

5. **Frontend Integration**:
   - [ ] Create AIAvatarInterviewer component
   - [ ] Update InterviewRoom page
   - [ ] Test real-time interaction

## 💡 Pro Tips

1. **Avatar Selection**: Use a professional-looking avatar that represents your company/brand
2. **Voice Selection**: Choose a clear, professional TTS voice
3. **Latency**: Aim for <2 seconds total latency (STT + LLM + TTS + Avatar)
4. **Fallback**: Always have a non-avatar mode in case GPU is unavailable
5. **Testing**: Test with various audio qualities and network conditions

## 🆘 Troubleshooting

### "CUDA out of memory"
- Reduce batch size
- Use FP16 precision
- Close other GPU applications

### "WebSocket connection failed"
- Check if avatar service is running
- Verify port is not blocked by firewall
- Check CORS settings

### "Avatar not syncing with audio"
- Check audio preprocessing
- Verify model is loaded correctly
- Test with pre-recorded audio first

## 📚 Resources

- [LiveTalking GitHub](https://github.com/lipku/LiveTalking)
- [MuseTalk Paper](https://github.com/TMElyralab/MuseTalk)
- [LiveKit MuseTalk](https://github.com/plutus123/Livekit_MuseTalk_Avatar)
- [Kokoro TTS](https://github.com/hexgrad/kokoro)
- [Piper TTS](https://github.com/rhasspy/piper)

---

**Ready to implement?** Start with Phase 1 and let me know which GPU option you're going with!
