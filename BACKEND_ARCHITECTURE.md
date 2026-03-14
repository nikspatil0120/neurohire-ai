# NeuroHire AI - Backend System Architecture

## 🏗️ System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                         │
│  - Admin/Recruiter/Candidate Dashboards                     │
│  - Interview Room UI                                        │
│  - Real-time WebSocket Connection                           │
└─────────────────────────────────────────────────────────────┘
                            ↕ HTTP/WebSocket
┌─────────────────────────────────────────────────────────────┐
│                 FastAPI Backend Server                      │
│  - REST API Endpoints                                       │
│  - WebSocket Manager                                        │
│  - Authentication & Authorization                           │
│  - File Upload Handler                                      │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                AI Processing Pipeline                       │
│  - Interview Orchestrator                                   │
│  - Speech-to-Text (Whisper)                                │
│  - Text-to-Speech (Coqui TTS)                              │
│  - Question Generator (LLM)                                │
│  - Answer Evaluator (NLP)                                  │
│  - Emotion Recognition (OpenCV)                            │
│  - Voice Analysis (Librosa)                                │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                   Data Layer                                │
│  - PostgreSQL (Users, Jobs, Interviews)                     │
│  - MongoDB (Transcripts, Logs)                             │
│  - File Storage (Resumes, Recordings)                       │
│  - Redis (Sessions, Cache)                                 │
└─────────────────────────────────────────────────────────────┘
```

## 📁 Backend Folder Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI app entry point
│   ├── config.py              # Configuration settings
│   ├── dependencies.py        # Dependency injection
│   │
│   ├── api/                   # API routes
│   │   ├── __init__.py
│   │   ├── auth.py           # Authentication endpoints
│   │   ├── users.py          # User management
│   │   ├── jobs.py           # Job management
│   │   ├── interviews.py     # Interview endpoints
│   │   ├── questions.py      # Question management
│   │   ├── reports.py        # Report generation
│   │   └── websocket.py      # WebSocket handlers
│   │
│   ├── models/               # Database models
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── job.py
│   │   ├── interview.py
│   │   ├── question.py
│   │   └── report.py
│   │
│   ├── schemas/              # Pydantic schemas
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── job.py
│   │   ├── interview.py
│   │   └── response.py
│   │
│   ├── services/             # Business logic
│   │   ├── __init__.py
│   │   ├── auth_service.py
│   │   ├── interview_service.py
│   │   ├── file_service.py
│   │   └── notification_service.py
│   │
│   ├── ai/                   # AI modules
│   │   ├── __init__.py
│   │   ├── orchestrator.py   # Main interview controller
│   │   ├── speech/
│   │   │   ├── stt.py       # Speech-to-Text
│   │   │   ├── tts.py       # Text-to-Speech
│   │   │   └── voice_analysis.py
│   │   ├── nlp/
│   │   │   ├── question_generator.py
│   │   │   ├── answer_evaluator.py
│   │   │   └── resume_parser.py
│   │   ├── vision/
│   │   │   ├── emotion_detector.py
│   │   │   └── face_tracker.py
│   │   └── scoring/
│   │       ├── adaptive_engine.py
│   │       └── report_generator.py
│   │
│   ├── core/                 # Core utilities
│   │   ├── __init__.py
│   │   ├── database.py       # Database connections
│   │   ├── security.py       # Security utilities
│   │   ├── storage.py        # File storage
│   │   └── websocket_manager.py
│   │
│   ├── utils/                # Helper functions
│   │   ├── __init__.py
│   │   ├── logger.py
│   │   ├── validators.py
│   │   └── exceptions.py
│   │
│   └── tests/                # Test files
│       ├── __init__.py
│       ├── test_api/
│       ├── test_ai/
│       └── test_services/
│
├── requirements.txt          # Python dependencies
├── docker-compose.yml       # Docker setup
├── Dockerfile              # Docker image
├── .env.example            # Environment variables
└── README.md               # Setup instructions
```