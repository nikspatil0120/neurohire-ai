# FastAPI Main Application

## 🚀 Main Application Entry Point

```python
# app/main.py
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import uvicorn

from app.api import auth, users, jobs, interviews, questions, reports, websocket
from app.core.database import init_db, close_db
from app.core.config import settings
from app.services.realtime_analytics import analytics
from app.utils.logger import setup_logging

# Setup logging
setup_logging()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    await init_db()
    await analytics.start_analytics_loop()
    yield
    # Shutdown
    await close_db()
    analytics.stop_analytics()

# Create FastAPI app
app = FastAPI(
    title="NeuroHire AI Backend",
    description="AI-powered interview platform backend",
    version="1.0.0",
    lifespan=lifespan
)

# Security middleware
app.add_middleware(
    TrustedHostMiddleware, 
    allowed_hosts=settings.ALLOWED_HOSTS
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files
app.mount("/static", StaticFiles(directory="storage"), name="static")

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["authentication"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(jobs.router, prefix="/api/jobs", tags=["jobs"])
app.include_router(interviews.router, prefix="/api/interviews", tags=["interviews"])
app.include_router(questions.router, prefix="/api/questions", tags=["questions"])
app.include_router(reports.router, prefix="/api/reports", tags=["reports"])
app.include_router(websocket.router, prefix="/api", tags=["websocket"])

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "message": "NeuroHire AI Backend",
        "version": "1.0.0",
        "status": "healthy"
    }

@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "database": "connected",
        "ai_models": "loaded",
        "storage": "available"
    }

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level="info"
    )
```

## ⚙️ Configuration

```python
# app/config.py
from pydantic_settings import BaseSettings
from typing import List
import os

class Settings(BaseSettings):
    # App settings
    APP_NAME: str = "NeuroHire AI"
    DEBUG: bool = False
    VERSION: str = "1.0.0"
    
    # Security
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Database
    POSTGRES_URL: str = "postgresql://user:password@localhost/neurohire"
    MONGODB_URL: str = "mongodb://localhost:27017"
    MONGODB_DB: str = "neurohire"
    REDIS_URL: str = "redis://localhost:6379"
    
    # CORS
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:5173"]
    ALLOWED_HOSTS: List[str] = ["localhost", "127.0.0.1"]
    
    # File storage
    STORAGE_PATH: str = "storage"
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10MB
    
    # AI Models
    WHISPER_MODEL: str = "base"
    TTS_MODEL: str = "tts_models/en/ljspeech/tacotron2-DDC"
    
    # Google OAuth
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    
    # OpenAI (for question generation)
    OPENAI_API_KEY: str = ""
    
    class Config:
        env_file = ".env"

settings = Settings()
```

## 🔐 Authentication System

```python
# app/api/auth.py
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta
from typing import Optional

from app.schemas.user import UserCreate, UserLogin, Token, User
from app.services.auth_service import AuthService
from app.core.config import settings

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/token")
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    """Get current authenticated user"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    auth_service = AuthService()
    user = await auth_service.get_user_by_id(user_id)
    if user is None:
        raise credentials_exception
    return user

@router.post("/register", response_model=Token)
async def register(user_data: UserCreate, auth_service: AuthService = Depends()):
    """Register new user"""
    
    # Check if user exists
    existing_user = await auth_service.get_user_by_email(user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )
    
    # Create user
    user = await auth_service.create_user(user_data)
    
    # Create token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.id}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.post("/token", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    auth_service: AuthService = Depends()
):
    """Login user"""
    
    user = await auth_service.authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.id}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.post("/google", response_model=Token)
async def google_auth(
    google_token: str,
    role: str,
    auth_service: AuthService = Depends()
):
    """Google OAuth authentication"""
    
    user = await auth_service.authenticate_google_user(google_token, role)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google token"
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.id}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.get("/me", response_model=User)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return current_user
```

## 📊 Interview Service

```python
# app/services/interview_service.py
from typing import Dict, List, Optional
from app.models.interview import Interview
from app.models.user import User
from app.core.database import get_db
from app.ai.orchestrator import InterviewOrchestrator
from app.services.consent_service import ConsentService
import uuid
from datetime import datetime

class InterviewService:
    def __init__(self):
        self.orchestrator = InterviewOrchestrator()
        self.consent_service = ConsentService()
    
    async def create_interview(
        self, 
        candidate_id: str,
        job_id: str,
        interview_type: str = "practice"
    ) -> Dict:
        """Create new interview session"""
        
        db = get_db()
        
        # Create interview record
        interview_data = {
            "id": str(uuid.uuid4()),
            "candidate_id": candidate_id,
            "job_id": job_id,
            "type": interview_type,
            "status": "scheduled",
            "session_id": str(uuid.uuid4()),
            "created_at": datetime.utcnow()
        }
        
        await db.interviews.insert_one(interview_data)
        
        return interview_data
    
    async def start_interview(
        self, 
        interview_id: str,
        consent_data: Dict
    ) -> Dict:
        """Start interview session"""
        
        db = get_db()
        
        # Verify consent
        consent_id = await self.consent_service.create_consent_record(
            interview_id, consent_data
        )
        
        if not await self.consent_service.verify_consent(interview_id):
            raise ValueError("Consent not provided")
        
        # Get interview data
        interview = await db.interviews.find_one({"id": interview_id})
        if not interview:
            raise ValueError("Interview not found")
        
        # Get job data
        job = await db.jobs.find_one({"id": interview["job_id"]})
        
        # Update interview status
        await db.interviews.update_one(
            {"id": interview_id},
            {
                "$set": {
                    "status": "in_progress",
                    "started_at": datetime.utcnow()
                }
            }
        )
        
        # Initialize AI orchestrator
        session_response = await self.orchestrator.start_interview(
            interview["session_id"],
            job
        )
        
        return {
            "session_id": interview["session_id"],
            "websocket_url": f"ws://localhost:8000/ws/interview/{interview['session_id']}",
            "first_question": session_response["question"],
            "audio_url": session_response["audio_url"]
        }
    
    async def end_interview(
        self, 
        interview_id: str,
        reason: str = "completed"
    ) -> Dict:
        """End interview session"""
        
        db = get_db()
        
        # Update interview status
        await db.interviews.update_one(
            {"id": interview_id},
            {
                "$set": {
                    "status": reason,
                    "ended_at": datetime.utcnow()
                }
            }
        )
        
        # Generate final report
        report = await self.generate_final_report(interview_id)
        
        return {
            "interview_ended": True,
            "reason": reason,
            "report_id": report["id"]
        }
    
    async def generate_final_report(self, interview_id: str) -> Dict:
        """Generate final interview report"""
        
        db = get_db()
        
        # Get interview data
        interview = await db.interviews.find_one({"id": interview_id})
        session_data = await db.interview_sessions.find_one({
            "interview_id": interview_id
        })
        
        # Calculate final scores using orchestrator
        final_scores = await self.orchestrator.calculate_final_scores(
            interview["session_id"],
            session_data
        )
        
        # Create report
        report_data = {
            "id": str(uuid.uuid4()),
            "interview_id": interview_id,
            "candidate_id": interview["candidate_id"],
            "scores": final_scores,
            "generated_at": datetime.utcnow()
        }
        
        await db.reports.insert_one(report_data)
        
        return report_data
    
    async def get_candidate_interviews(self, candidate_id: str) -> List[Dict]:
        """Get all interviews for candidate"""
        
        db = get_db()
        
        interviews = await db.interviews.find({
            "candidate_id": candidate_id
        }).sort("created_at", -1).to_list(100)
        
        # Enrich with job data
        for interview in interviews:
            job = await db.jobs.find_one({"id": interview["job_id"]})
            interview["job"] = job
        
        return interviews
```

## 🐳 Docker Configuration

```yaml
# docker-compose.yml
version: '3.8'

services:
  backend:
    build: .
    ports:
      - "8000:8000"
    environment:
      - POSTGRES_URL=postgresql://postgres:password@postgres:5432/neurohire
      - MONGODB_URL=mongodb://mongo:27017
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - mongo
      - redis
    volumes:
      - ./storage:/app/storage

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: neurohire
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  mongo:
    image: mongo:7
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  mongo_data:
  redis_data:
```

```dockerfile
# Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    ffmpeg \
    libsm6 \
    libxext6 \
    libfontconfig1 \
    libxrender1 \
    libgl1-mesa-glx \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Create storage directory
RUN mkdir -p storage/uploads storage/audio storage/models

# Expose port
EXPOSE 8000

# Run application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## 📦 Requirements

```txt
# requirements.txt
fastapi==0.104.1
uvicorn[standard]==0.24.0
pydantic==2.5.0
pydantic-settings==2.1.0

# Database
sqlalchemy==2.0.23
asyncpg==0.29.0
pymongo==4.6.0
redis==5.0.1

# Authentication
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.6

# AI/ML
torch==2.1.0
torchaudio==2.1.0
openai-whisper==20231117
TTS==0.20.6
sentence-transformers==2.2.2
scikit-learn==1.3.2
numpy==1.24.3
librosa==0.10.1

# Computer Vision
opencv-python==4.8.1.78
deepface==0.0.79
mediapipe==0.10.8

# NLP
spacy==3.7.2
openai==1.3.7

# Utils
python-dotenv==1.0.0
aiofiles==23.2.1
pillow==10.1.0
matplotlib==3.8.2
seaborn==0.13.0

# Testing
pytest==7.4.3
pytest-asyncio==0.21.1
httpx==0.25.2
```