# Avatar Architecture - Complete Explanation

## Overview

The interview room now has TWO distinct video displays:

```
┌─────────────────────────────────────────────────────────────┐
│                     INTERVIEW ROOM                          │
├──────────────────────────┬──────────────────────────────────┤
│   LEFT: AI INTERVIEWER   │   RIGHT: YOUR CAMERA             │
│                          │                                  │
│   👤 AI Avatar           │   👤 Candidate (You)             │
│   (MuseTalk/LiveTalking) │   (Your Webcam)                  │
│                          │                                  │
│   • Asks questions       │   • Shows your face              │
│   • Lip-synced video     │   • Live webcam feed             │
│   • Talking head AI      │   • Monitored for emotions       │
│                          │                                  │
└──────────────────────────┴──────────────────────────────────┘
```

---

## LEFT SIDE: AI Avatar Interviewer

### What It Is
- A **virtual human interviewer** powered by AI
- Uses MuseTalk/LiveTalking technology to create realistic talking head videos
- The AI **asks questions** and **responds** to your answers

### Current State (Placeholder)
- Shows a **professional avatar silhouette** placeholder
- Animated to show when AI is speaking
- Has waveform visualization during speech
- Status: "AI Speaking..." or "AI Listening"

### Future Integration (MuseTalk)
When you integrate the real MuseTalk service:
1. The placeholder will be replaced with actual video
2. The AI interviewer's face will lip-sync perfectly to the generated speech
3. The video will show realistic facial movements and expressions

### How It Works
```
Backend generates question
     ↓
TTS converts text to speech (Kokoro/Piper)
     ↓
MuseTalk generates lip-synced video
     ↓
Video streams to frontend via WebSocket
     ↓
Plays in AIAvatarInterviewer component
```

**File**: `src/components/AIAvatarInterviewer.tsx`

---

## RIGHT SIDE: Your Camera (Candidate)

### What It Is
- **Your actual webcam** feed
- Shows YOU (the candidate being interviewed)
- Monitors your facial expressions for emotion analysis

### What It Does
- Captures your live video feed
- Shows "LIVE" indicator in red
- Mirrors the video (like looking in a mirror)
- Can be used for:
  - Emotion detection (facial analysis)
  - Recording the interview
  - Proctoring/monitoring
  - Sending to backend for analysis

### Permissions Required
- ✅ **Camera access** - Shows your face (required)
- ✅ **Microphone access** - Records your voice (handled by AIAvatarInterviewer)

**File**: `src/components/CandidateCamera.tsx`

---

## How They Work Together

### Audio Flow
```
Your Microphone (managed by AIAvatarInterviewer)
     ↓
Captures your audio
     ↓
Sends to backend via WebSocket
     ↓
Backend STT (Whisper) transcribes your answer
     ↓
Backend generates AI response
     ↓
TTS creates speech audio
     ↓
MuseTalk creates lip-synced avatar video
     ↓
Streams back to frontend
     ↓
AI Avatar speaks the response
```

### Video Flow
```
LEFT (AI Avatar):
Backend → MuseTalk video → WebSocket → AIAvatarInterviewer.tsx → Display

RIGHT (Your Camera):
Your Webcam → Browser getUserMedia → CandidateCamera.tsx → Display
                                                          ↓
                                    (Optional) Send to backend for analysis
```

---

## Key Differences

| Feature | AI Avatar (LEFT) | Your Camera (RIGHT) |
|---------|------------------|---------------------|
| **Source** | AI-generated video from backend | Your actual webcam |
| **Direction** | Backend → Frontend | Device → Frontend (→ Backend optional) |
| **Purpose** | Ask questions, conduct interview | Show your reactions, emotions |
| **Audio** | AI-generated speech | Your microphone input |
| **Technology** | MuseTalk/LiveTalking | Standard WebRTC getUserMedia |
| **File** | `AIAvatarInterviewer.tsx` | `CandidateCamera.tsx` |

---

## Current Implementation Status

### ✅ Working Now
1. **AI Avatar Interviewer (LEFT)**
   - ✅ WebSocket connection to backend
   - ✅ Receives questions from AI
   - ✅ Shows placeholder avatar
   - ✅ Animated speaking states
   - ✅ Status indicators
   - ✅ Microphone capture for candidate audio
   - ✅ Audio streaming to backend

2. **Candidate Camera (RIGHT)**
   - ✅ Webcam access and display
   - ✅ Live video feed
   - ✅ "LIVE" indicator
   - ✅ Error handling
   - ✅ Camera permission handling
   - ✅ Video mirroring (natural view)

### ⏳ To Be Integrated
1. **MuseTalk Service** - Real talking head video generation
2. **Real STT** - Whisper for accurate transcription
3. **Real TTS** - Kokoro/Piper for natural speech
4. **Emotion Detection** - DeepFace for candidate analysis
5. **Video Recording** - Save interview sessions

---

## Integration Points

### When You Have MuseTalk Service Running

**Step 1**: Update `backend/app/services/avatar_service.py`
- Replace mock transcription with real Whisper STT
- Replace mock responses with real TTS + MuseTalk
- Return actual video chunks

**Step 2**: Update `src/components/AIAvatarInterviewer.tsx`
- Change video element display from `none` to `block`
- Handle incoming video chunks from WebSocket
- Construct video stream for display

**Step 3**: Connect to your MuseTalk server
- Set `AVATAR_SERVICE_URL` in backend `.env`
- Ensure MuseTalk API is accessible
- Test video generation endpoint

---

## File Structure

```
src/
├── components/
│   ├── AIAvatarInterviewer.tsx     ← LEFT: AI interviewer (MuseTalk)
│   └── CandidateCamera.tsx         ← RIGHT: Your webcam
└── pages/
    └── candidate/
        └── InterviewRoom.tsx       ← Main interview page (uses both)

backend/
└── app/
    ├── api/
    │   └── avatar.py               ← WebSocket endpoint
    └── services/
        └── avatar_service.py       ← MuseTalk integration
```

---

## Summary

**LEFT = AI ASKS QUESTIONS** (Virtual interviewer generated by MuseTalk)
- Placeholder now, real video when MuseTalk is integrated
- Receives audio from your microphone
- Generates questions and responses

**RIGHT = YOUR FACE** (Real webcam showing you)
- Live camera feed
- Shows your reactions
- Can be analyzed for emotions

Both work together to create a realistic AI interview experience where:
1. The AI avatar asks you questions (like a real interviewer)
2. You answer while looking at your own camera
3. Your responses are analyzed and the AI generates follow-up questions
4. The cycle continues for a complete interview

---

## What You'll See Now

After refreshing the page:

**LEFT SIDE**:
- Large professional avatar silhouette (blue/purple gradient)
- Badge saying "AI Interviewer"
- Waveform animation when speaking
- Status: "AI Speaking..." or "AI Listening"
- Connection status indicator

**RIGHT SIDE**:
- Your actual webcam feed (mirrored)
- "Your Camera" label
- "LIVE" indicator with red dot
- Full video display

**Both sides** are clearly labeled and work independently!

When MuseTalk is integrated, the LEFT side will show a realistic human face speaking to you instead of the placeholder.

---

**Status**: Architecture complete and working! Ready for MuseTalk integration. 🎉
