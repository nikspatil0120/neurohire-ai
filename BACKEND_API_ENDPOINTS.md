# FastAPI Endpoints Specification

## 🔐 Authentication Endpoints

### POST /auth/login
```json
{
  "email": "user@example.com",
  "password": "password123",
  "role": "candidate"
}
```
**Response:**
```json
{
  "access_token": "jwt_token",
  "token_type": "bearer",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "candidate"
  }
}
```

### POST /auth/google
```json
{
  "google_token": "google_oauth_token",
  "role": "candidate"
}
```

### POST /auth/logout
```json
{
  "message": "Successfully logged out"
}
```

## 👥 User Management

### GET /users/me
**Headers:** `Authorization: Bearer {token}`
**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "role": "candidate",
  "profile": {
    "skills": ["Python", "React"],
    "experience": 3,
    "resume_url": "path/to/resume.pdf"
  }
}
```

### PUT /users/me
**Body:**
```json
{
  "name": "John Doe",
  "skills": ["Python", "React", "Node.js"],
  "experience": 3
}
```

### POST /users/upload-resume
**Form Data:** `file: resume.pdf`
**Response:**
```json
{
  "resume_url": "uploads/resumes/uuid_resume.pdf",
  "parsed_data": {
    "skills": ["Python", "React"],
    "experience": 3,
    "education": "B.Tech Computer Science"
  }
}
```

## 💼 Job Management

### GET /jobs
**Query Params:** `?page=1&limit=10&status=active`
**Response:**
```json
{
  "jobs": [
    {
      "id": "uuid",
      "title": "Senior Frontend Developer",
      "company": "TechCorp",
      "description": "Job description...",
      "requirements": ["React", "TypeScript"],
      "status": "active",
      "created_at": "2024-01-15T10:00:00Z"
    }
  ],
  "total": 25,
  "page": 1,
  "pages": 3
}
```

### POST /jobs
**Body:**
```json
{
  "title": "Senior Frontend Developer",
  "description": "Job description...",
  "requirements": ["React", "TypeScript"],
  "interview_config": {
    "duration_minutes": 45,
    "difficulty": "adaptive",
    "max_warnings": 3,
    "min_score_threshold": 20
  }
}
```

### GET /jobs/{job_id}
### PUT /jobs/{job_id}
### DELETE /jobs/{job_id}

## 🎯 Interview Management

### POST /interviews/schedule
```json
{
  "job_id": "uuid",
  "candidate_id": "uuid",
  "type": "practice", // or "actual"
  "scheduled_at": "2024-01-20T14:00:00Z"
}
```

### GET /interviews/me
**Response:**
```json
{
  "interviews": [
    {
      "id": "uuid",
      "job": {
        "title": "Frontend Developer",
        "company": "TechCorp"
      },
      "type": "actual",
      "status": "scheduled",
      "scheduled_at": "2024-01-20T14:00:00Z",
      "duration_minutes": 45
    }
  ]
}
```

### POST /interviews/{interview_id}/start
**Response:**
```json
{
  "session_id": "uuid",
  "websocket_url": "ws://localhost:8000/ws/interview/{session_id}",
  "first_question": {
    "id": "uuid",
    "text": "Tell me about yourself",
    "audio_url": "path/to/question.wav",
    "difficulty": 1
  }
}
```

### POST /interviews/{interview_id}/end
```json
{
  "reason": "completed", // or "terminated"
  "final_score": 78.5
}
```

## 🎤 Real-time Interview WebSocket

### WebSocket: /ws/interview/{session_id}

**Client → Server Messages:**

1. **Audio Chunk**
```json
{
  "type": "audio_chunk",
  "data": "base64_audio_data",
  "timestamp": "2024-01-20T14:05:30Z"
}
```

2. **Video Frame**
```json
{
  "type": "video_frame",
  "data": "base64_image_data",
  "timestamp": "2024-01-20T14:05:30Z"
}
```

3. **Answer Complete**
```json
{
  "type": "answer_complete",
  "question_id": "uuid"
}
```

**Server → Client Messages:**

1. **Transcript Update**
```json
{
  "type": "transcript",
  "text": "I have experience with React and TypeScript...",
  "is_final": false,
  "timestamp": "2024-01-20T14:05:30Z"
}
```

2. **Emotion Analysis**
```json
{
  "type": "emotion_analysis",
  "emotions": {
    "confidence": 78,
    "stress": 25,
    "engagement": 82,
    "calm": 65
  },
  "timestamp": "2024-01-20T14:05:30Z"
}
```

3. **Voice Analysis**
```json
{
  "type": "voice_analysis",
  "confidence": 86,
  "speech_rate": 145,
  "pause_count": 3,
  "timestamp": "2024-01-20T14:05:30Z"
}
```

4. **Next Question**
```json
{
  "type": "next_question",
  "question": {
    "id": "uuid",
    "text": "Explain the difference between let and const",
    "audio_url": "path/to/question.wav",
    "difficulty": 2
  },
  "progress": {
    "current": 3,
    "total": 10
  }
}
```

5. **Interview Terminated**
```json
{
  "type": "interview_terminated",
  "reason": "policy_violation",
  "message": "Multiple tab switches detected"
}
```

## 📊 Reports & Analytics

### GET /reports/{interview_id}
**Response:**
```json
{
  "interview_id": "uuid",
  "candidate": {
    "name": "John Doe",
    "email": "john@example.com"
  },
  "job": {
    "title": "Frontend Developer",
    "company": "TechCorp"
  },
  "scores": {
    "technical": 78.5,
    "communication": 72.0,
    "confidence": 65.0,
    "final_score": 73.2
  },
  "analysis": {
    "strengths": ["Good React knowledge", "Clear communication"],
    "weaknesses": ["Algorithm complexity understanding"],
    "recommendations": ["Practice data structures"]
  },
  "question_performance": [
    {
      "question": "Explain React hooks",
      "answer_score": 85,
      "time_taken": 120,
      "keywords_covered": ["useState", "useEffect"]
    }
  ],
  "behavioral_metrics": {
    "eye_contact_percentage": 68,
    "avg_speech_rate": 145,
    "emotion_distribution": {
      "confident": 45,
      "neutral": 35,
      "nervous": 20
    }
  }
}
```

### GET /reports/candidate/{candidate_id}
**Response:** List of all reports for candidate

### GET /reports/job/{job_id}/rankings
**Response:**
```json
{
  "rankings": [
    {
      "candidate": {
        "name": "John Doe",
        "email": "john@example.com"
      },
      "final_score": 85.2,
      "technical_score": 88.0,
      "confidence_score": 78.0,
      "interview_date": "2024-01-20T14:00:00Z",
      "recommendation": "strong_hire"
    }
  ]
}
```

## 🗃️ Question Management

### GET /questions
**Query:** `?category=react&difficulty=medium&type=technical`
**Response:**
```json
{
  "questions": [
    {
      "id": "uuid",
      "text": "Explain React hooks",
      "category": "react",
      "difficulty": 3,
      "type": "technical",
      "expected_keywords": ["useState", "useEffect", "lifecycle"],
      "follow_up_questions": ["uuid1", "uuid2"]
    }
  ]
}
```

### POST /questions
```json
{
  "text": "What is the difference between let and const?",
  "category": "javascript",
  "difficulty": 2,
  "type": "technical",
  "expected_keywords": ["block scope", "hoisting", "reassignment"],
  "expected_answer": "let allows reassignment while const doesn't..."
}
```

## 📁 File Management

### POST /files/upload
**Form Data:** `file: document.pdf, type: resume`
**Response:**
```json
{
  "file_url": "uploads/resumes/uuid_document.pdf",
  "file_size": 1024000,
  "content_type": "application/pdf"
}
```

### GET /files/{file_path}
**Response:** File download

## 🔍 Admin Endpoints

### GET /admin/system-stats
**Response:**
```json
{
  "active_interviews": 5,
  "total_candidates": 1284,
  "total_recruiters": 24,
  "system_health": {
    "ai_models_status": "healthy",
    "database_status": "healthy",
    "storage_status": "healthy"
  }
}
```

### GET /admin/logs
**Query:** `?level=error&limit=100`
**Response:**
```json
{
  "logs": [
    {
      "timestamp": "2024-01-20T14:05:30Z",
      "level": "error",
      "message": "Speech recognition failed",
      "interview_id": "uuid"
    }
  ]
}
```