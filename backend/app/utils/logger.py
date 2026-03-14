import logging
import sys
from pathlib import Path
from logging.handlers import RotatingFileHandler
from datetime import datetime

def setup_logging(log_level: str = "INFO", log_file: str = "app.log"):
    """Setup application logging"""
    
    # Create logs directory
    log_dir = Path("logs")
    log_dir.mkdir(exist_ok=True)
    
    # Configure logging level
    level = getattr(logging, log_level.upper(), logging.INFO)
    
    # Create formatter
    formatter = logging.Formatter(
        fmt="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )
    
    # Setup root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(level)
    
    # Remove existing handlers
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)
    
    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(level)
    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)
    
    # File handler with rotation
    file_handler = RotatingFileHandler(
        log_dir / log_file,
        maxBytes=10*1024*1024,  # 10MB
        backupCount=5
    )
    file_handler.setLevel(level)
    file_handler.setFormatter(formatter)
    root_logger.addHandler(file_handler)
    
    # Specific loggers for different components
    loggers = [
        "app.ai",
        "app.api", 
        "app.services",
        "app.core",
        "uvicorn.access",
        "uvicorn.error"
    ]
    
    for logger_name in loggers:
        logger = logging.getLogger(logger_name)
        logger.setLevel(level)
    
    # Reduce noise from external libraries
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("requests").setLevel(logging.WARNING)
    logging.getLogger("asyncio").setLevel(logging.WARNING)
    
    logging.info("Logging setup completed")

def get_logger(name: str) -> logging.Logger:
    """Get logger for specific module"""
    return logging.getLogger(name)

class InterviewLogger:
    """Specialized logger for interview sessions"""
    
    def __init__(self, session_id: str):
        self.session_id = session_id
        self.logger = logging.getLogger(f"interview.{session_id}")
        
        # Create session-specific log file
        log_dir = Path("logs/interviews")
        log_dir.mkdir(parents=True, exist_ok=True)
        
        # Session log file
        log_file = log_dir / f"{session_id}.log"
        
        # File handler for this session
        file_handler = logging.FileHandler(log_file)
        file_handler.setLevel(logging.INFO)
        
        formatter = logging.Formatter(
            fmt="%(asctime)s - %(levelname)s - %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S"
        )
        file_handler.setFormatter(formatter)
        
        self.logger.addHandler(file_handler)
        self.logger.setLevel(logging.INFO)
    
    def log_question(self, question: dict):
        """Log interview question"""
        self.logger.info(f"QUESTION: {question.get('text', '')}")
        self.logger.info(f"DIFFICULTY: {question.get('difficulty', 'N/A')}")
        self.logger.info(f"CATEGORY: {question.get('category', 'N/A')}")
    
    def log_response(self, response_data: dict):
        """Log candidate response"""
        transcript = response_data.get("transcript", {})
        score = response_data.get("answer_score", {})
        
        self.logger.info(f"RESPONSE: {transcript.get('text', '')}")
        self.logger.info(f"CONFIDENCE: {transcript.get('confidence', 0)}")
        self.logger.info(f"SCORE: {score.get('score', 0)}")
        self.logger.info(f"FEEDBACK: {score.get('feedback', '')}")
    
    def log_emotion(self, emotion_data: dict):
        """Log emotion analysis"""
        self.logger.info(f"EMOTION: {emotion_data.get('dominant_emotion', 'unknown')}")
        self.logger.info(f"CONFIDENCE: {emotion_data.get('confidence', 0)}")
        self.logger.info(f"FACE_DETECTED: {emotion_data.get('face_detected', False)}")
    
    def log_voice_analysis(self, voice_data: dict):
        """Log voice analysis"""
        self.logger.info(f"VOICE_CONFIDENCE: {voice_data.get('confidence', 0)}")
        self.logger.info(f"SPEECH_RATE: {voice_data.get('speech_rate', 0)}")
        self.logger.info(f"PITCH_STABILITY: {voice_data.get('pitch_stability', 0)}")
    
    def log_session_end(self, final_scores: dict):
        """Log session completion"""
        self.logger.info("=== SESSION COMPLETED ===")
        self.logger.info(f"TECHNICAL_SCORE: {final_scores.get('technical_score', 0)}")
        self.logger.info(f"COMMUNICATION_SCORE: {final_scores.get('communication_score', 0)}")
        self.logger.info(f"CONFIDENCE_SCORE: {final_scores.get('confidence_score', 0)}")
        self.logger.info(f"FINAL_SCORE: {final_scores.get('final_score', 0)}")
    
    def log_error(self, error: str, context: str = ""):
        """Log error with context"""
        self.logger.error(f"ERROR in {context}: {error}")
    
    def log_warning(self, warning: str, context: str = ""):
        """Log warning with context"""
        self.logger.warning(f"WARNING in {context}: {warning}")

class APILogger:
    """Specialized logger for API requests"""
    
    def __init__(self):
        self.logger = logging.getLogger("api.requests")
    
    def log_request(self, method: str, path: str, user_id: int = None, ip: str = None):
        """Log API request"""
        self.logger.info(f"{method} {path} - User: {user_id} - IP: {ip}")
    
    def log_response(self, method: str, path: str, status_code: int, duration: float):
        """Log API response"""
        self.logger.info(f"{method} {path} - {status_code} - {duration:.3f}s")
    
    def log_error(self, method: str, path: str, error: str, user_id: int = None):
        """Log API error"""
        self.logger.error(f"{method} {path} - User: {user_id} - Error: {error}")

class SecurityLogger:
    """Specialized logger for security events"""
    
    def __init__(self):
        self.logger = logging.getLogger("security")
        
        # Create security log file
        log_dir = Path("logs/security")
        log_dir.mkdir(parents=True, exist_ok=True)
        
        file_handler = RotatingFileHandler(
            log_dir / "security.log",
            maxBytes=5*1024*1024,  # 5MB
            backupCount=10
        )
        
        formatter = logging.Formatter(
            fmt="%(asctime)s - SECURITY - %(levelname)s - %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S"
        )
        file_handler.setFormatter(formatter)
        
        self.logger.addHandler(file_handler)
        self.logger.setLevel(logging.INFO)
    
    def log_login_attempt(self, email: str, success: bool, ip: str = None):
        """Log login attempt"""
        status = "SUCCESS" if success else "FAILED"
        self.logger.info(f"LOGIN {status} - Email: {email} - IP: {ip}")
    
    def log_unauthorized_access(self, path: str, user_id: int = None, ip: str = None):
        """Log unauthorized access attempt"""
        self.logger.warning(f"UNAUTHORIZED ACCESS - Path: {path} - User: {user_id} - IP: {ip}")
    
    def log_suspicious_activity(self, activity: str, user_id: int = None, ip: str = None):
        """Log suspicious activity"""
        self.logger.warning(f"SUSPICIOUS ACTIVITY - {activity} - User: {user_id} - IP: {ip}")
    
    def log_data_access(self, resource: str, user_id: int, action: str):
        """Log sensitive data access"""
        self.logger.info(f"DATA ACCESS - Resource: {resource} - User: {user_id} - Action: {action}")

# Initialize logging on import
setup_logging()