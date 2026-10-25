from pydantic_settings import BaseSettings
from typing import List
import os
import json

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
    POSTGRES_URL: str = "postgresql://postgres:password@localhost:5432/neurohire"
    MONGODB_URL: str = "mongodb+srv://sahilghogaressg06_db_user:r229cEXXqqs4LNTq@cluster0.wox3xqs.mongodb.net/neurohire_ai?appName=Cluster0"
    MONGODB_DB: str = "neurohire_ai"
    REDIS_URL: str = "redis://127.0.0.1:6379"
    
    # CORS - will be parsed from .env
    ALLOWED_ORIGINS: str = '["http://localhost:3000","http://localhost:5173"]'
    ALLOWED_HOSTS: str = '["*"]'
    
    # File storage
    STORAGE_PATH: str = "storage"
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10MB
    
    # AI Models
    WHISPER_MODEL: str = "base"
    TTS_MODEL: str = "tts_models/en/ljspeech/tacotron2-DDC"
    
    # External APIs
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    OPENAI_API_KEY: str = ""

    # AI Interview APIs
    GEMINI_API_KEY: str = ""
    GROQ_API_KEY: str = ""

    # Email Service
    BREVO_API_KEY: str = ""
    EMAIL_SERVICE_URL: str = "http://localhost:8000/api/v1/email"
    SENDER_EMAIL: str = "neurohireaiplatform@gmail.com"
    SENDER_NAME: str = "NeuroHire AI"
    
    class Config:
        # Look for .env in backend/ dir or project root
        env_file = (".env", "../.env")
        env_file_encoding = "utf-8"
        extra = "ignore"
    
    @property
    def allowed_origins_list(self) -> List[str]:
        """Parse ALLOWED_ORIGINS from JSON string"""
        try:
            return json.loads(self.ALLOWED_ORIGINS)
        except:
            return ["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:5173"]
    
    @property
    def allowed_hosts_list(self) -> List[str]:
        """Parse ALLOWED_HOSTS from JSON string"""
        try:
            return json.loads(self.ALLOWED_HOSTS)
        except:
            return ["*"]

settings = Settings()