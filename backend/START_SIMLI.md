# Starting Simli Avatar System

## Prerequisites

You need **3 services running**:

1. **LiveKit Server** (for WebRTC)
2. **FastAPI Backend** (NeuroHire)
3. **Simli Agent** (avatar worker)

---

## Option 1: Quick Start with LiveKit Cloud (EASIEST)

1. **Sign up for LiveKit Cloud** (free):
   - Go to: https://cloud.livekit.io
   - Sign up for free account
   - Create a new project
   - Copy your `LIVEKIT_URL`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET`

2. **Update backend/.env**:
   ```env
   LIVEKIT_URL=wss://your-project.livekit.cloud
   LIVEKIT_API_KEY=your_api_key
   LIVEKIT_API_SECRET=your_api_secret
   ```

3. **Start the backend**:
   ```cmd
   cd backend
   py -m uvicorn app.main:app --reload
   ```

4. **Start the Simli agent** (in a new terminal):
   ```cmd
   cd backend
   py simli_agent.py start
   ```

5. **Open React frontend**:
   ```cmd
   npm run dev
   ```

---

## Option 2: Local LiveKit Server (for offline development)

### Install LiveKit locally:

**Using Docker** (easiest):
```cmd
docker run --rm -p 7880:7880 -p 7881:7881 -p 7882:7882/udp ^
  -e LIVEKIT_KEYS="devkey: secret" ^
  livekit/livekit-server --dev
```

**Or download binary**:
1. Download from: https://github.com/livekit/livekit/releases
2. Extract and run: `livekit-server.exe --dev`

Then use these values in `.env`:
```env
LIVEKIT_URL=ws://localhost:7880
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret
```

---

## Testing the Setup

1. **Check backend health**:
   ```cmd
   curl http://localhost:8000/api/simli/health
   ```

   Should return:
   ```json
   {
     "configured": true,
     "face_id": "cace3ef7-a4c4-425d-a8cf-a5358eb0c427"
   }
   ```

2. **Create a test session**:
   ```cmd
   curl -X POST http://localhost:8000/api/simli/create-session ^
     -H "Content-Type: application/json" ^
     -d "{\"candidate_name\": \"Test User\"}"
   ```

3. **Open the interview room** in React:
   - Navigate to `/candidate/interview-room`
   - You should see the avatar connect via LiveKit

---

## Troubleshooting

### "Simli credentials not configured"
- Check that `SIMLI_API_KEY` and `SIMLI_FACE_ID` are in `.env`

### "LiveKit connection failed"
- Make sure LiveKit server is running
- Check `LIVEKIT_URL` is correct
- For cloud: use `wss://` URL
- For local: use `ws://localhost:7880`

### "Agent not starting"
- Make sure all dependencies are installed: `py -m pip install -r requirements.txt`
- Check that OpenAI API key is set (needed for LLM)

---

## Next Steps

Once everything is running, you'll need to:

1. **Update React to use LiveKit** instead of old LiveTalking WebRTC
2. **Integrate interview logic** (STT → LLM → TTS → Avatar)
3. **Add interview state management**

I'll help you with the React integration next!
