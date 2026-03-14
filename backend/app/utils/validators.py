import re
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
import email_validator
from pydantic import BaseModel, validator

class ValidationError(Exception):
    """Custom validation error"""
    pass

class EmailValidator:
    """Email validation utilities"""
    
    @staticmethod
    def is_valid_email(email: str) -> bool:
        """Validate email format"""
        try:
            email_validator.validate_email(email)
            return True
        except email_validator.EmailNotValidError:
            return False
    
    @staticmethod
    def normalize_email(email: str) -> str:
        """Normalize email address"""
        try:
            valid = email_validator.validate_email(email)
            return valid.email
        except email_validator.EmailNotValidError:
            raise ValidationError(f"Invalid email format: {email}")

class PasswordValidator:
    """Password validation utilities"""
    
    @staticmethod
    def validate_password(password: str) -> Dict[str, Any]:
        """Validate password strength"""
        validations = {
            "min_length": len(password) >= 8,
            "max_length": len(password) <= 128,
            "has_upper": bool(re.search(r'[A-Z]', password)),
            "has_lower": bool(re.search(r'[a-z]', password)),
            "has_digit": bool(re.search(r'\d', password)),
            "has_special": bool(re.search(r'[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]', password)),
            "no_common_patterns": not PasswordValidator._has_common_patterns(password)
        }
        
        validations["is_strong"] = all(validations.values())
        validations["score"] = sum(validations.values()) / len(validations)
        
        return validations
    
    @staticmethod
    def _has_common_patterns(password: str) -> bool:
        """Check for common weak patterns"""
        common_patterns = [
            r'123456',
            r'password',
            r'qwerty',
            r'abc123',
            r'admin',
            r'letmein'
        ]
        
        password_lower = password.lower()
        return any(re.search(pattern, password_lower) for pattern in common_patterns)
    
    @staticmethod
    def generate_password_feedback(validations: Dict[str, Any]) -> List[str]:
        """Generate password improvement feedback"""
        feedback = []
        
        if not validations["min_length"]:
            feedback.append("Password must be at least 8 characters long")
        
        if not validations["has_upper"]:
            feedback.append("Password must contain at least one uppercase letter")
        
        if not validations["has_lower"]:
            feedback.append("Password must contain at least one lowercase letter")
        
        if not validations["has_digit"]:
            feedback.append("Password must contain at least one number")
        
        if not validations["has_special"]:
            feedback.append("Password must contain at least one special character")
        
        if not validations["no_common_patterns"]:
            feedback.append("Password contains common patterns, please choose a more unique password")
        
        return feedback

class FileValidator:
    """File validation utilities"""
    
    ALLOWED_RESUME_EXTENSIONS = {'.pdf', '.doc', '.docx'}
    ALLOWED_IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif'}
    ALLOWED_AUDIO_EXTENSIONS = {'.mp3', '.wav', '.m4a', '.ogg'}
    ALLOWED_VIDEO_EXTENSIONS = {'.mp4', '.webm', '.avi', '.mov'}
    
    MAX_RESUME_SIZE = 10 * 1024 * 1024  # 10MB
    MAX_IMAGE_SIZE = 5 * 1024 * 1024    # 5MB
    MAX_AUDIO_SIZE = 50 * 1024 * 1024   # 50MB
    MAX_VIDEO_SIZE = 100 * 1024 * 1024  # 100MB
    
    @staticmethod
    def validate_resume_file(filename: str, file_size: int) -> Dict[str, Any]:
        """Validate resume file"""
        extension = FileValidator._get_file_extension(filename)
        
        return {
            "valid_extension": extension in FileValidator.ALLOWED_RESUME_EXTENSIONS,
            "valid_size": file_size <= FileValidator.MAX_RESUME_SIZE,
            "extension": extension,
            "size": file_size,
            "max_size": FileValidator.MAX_RESUME_SIZE
        }
    
    @staticmethod
    def validate_image_file(filename: str, file_size: int) -> Dict[str, Any]:
        """Validate image file"""
        extension = FileValidator._get_file_extension(filename)
        
        return {
            "valid_extension": extension in FileValidator.ALLOWED_IMAGE_EXTENSIONS,
            "valid_size": file_size <= FileValidator.MAX_IMAGE_SIZE,
            "extension": extension,
            "size": file_size,
            "max_size": FileValidator.MAX_IMAGE_SIZE
        }
    
    @staticmethod
    def _get_file_extension(filename: str) -> str:
        """Get file extension in lowercase"""
        return '.' + filename.split('.')[-1].lower() if '.' in filename else ''
    
    @staticmethod
    def sanitize_filename(filename: str) -> str:
        """Sanitize filename for safe storage"""
        # Remove path separators and dangerous characters
        filename = re.sub(r'[<>:"/\\|?*]', '', filename)
        
        # Remove leading/trailing spaces and dots
        filename = filename.strip(' .')
        
        # Limit length
        if len(filename) > 255:
            name, ext = filename.rsplit('.', 1) if '.' in filename else (filename, '')
            filename = name[:255-len(ext)-1] + '.' + ext if ext else name[:255]
        
        return filename

class InterviewValidator:
    """Interview-specific validation utilities"""
    
    @staticmethod
    def validate_interview_schedule(scheduled_at: datetime) -> Dict[str, Any]:
        """Validate interview scheduling"""
        now = datetime.utcnow()
        min_advance = now + timedelta(hours=1)  # At least 1 hour in advance
        max_advance = now + timedelta(days=30)  # At most 30 days in advance
        
        return {
            "is_future": scheduled_at > now,
            "min_advance_met": scheduled_at >= min_advance,
            "max_advance_met": scheduled_at <= max_advance,
            "is_business_hours": InterviewValidator._is_business_hours(scheduled_at),
            "scheduled_at": scheduled_at,
            "min_time": min_advance,
            "max_time": max_advance
        }
    
    @staticmethod
    def _is_business_hours(dt: datetime) -> bool:
        """Check if datetime is within business hours (9 AM - 6 PM, Mon-Fri)"""
        # This is a simple check, in reality you'd consider timezones
        weekday = dt.weekday()  # 0 = Monday, 6 = Sunday
        hour = dt.hour
        
        return weekday < 5 and 9 <= hour < 18  # Monday-Friday, 9 AM - 6 PM
    
    @staticmethod
    def validate_session_data(session_data: Dict) -> Dict[str, Any]:
        """Validate interview session data"""
        required_fields = ["session_id", "interview_id", "candidate_id", "job_id"]
        
        validations = {
            "has_required_fields": all(field in session_data for field in required_fields),
            "valid_session_id": bool(session_data.get("session_id", "").strip()),
            "valid_interview_id": isinstance(session_data.get("interview_id"), int),
            "valid_candidate_id": isinstance(session_data.get("candidate_id"), int),
            "valid_job_id": isinstance(session_data.get("job_id"), int),
            "has_questions": bool(session_data.get("questions", [])),
            "has_responses": isinstance(session_data.get("responses", []), list)
        }
        
        validations["is_valid"] = all(validations.values())
        return validations

class JobValidator:
    """Job posting validation utilities"""
    
    @staticmethod
    def validate_job_data(job_data: Dict) -> Dict[str, Any]:
        """Validate job posting data"""
        validations = {
            "has_title": bool(job_data.get("title", "").strip()),
            "has_description": bool(job_data.get("description", "").strip()),
            "has_requirements": bool(job_data.get("requirements", [])),
            "has_skills": bool(job_data.get("skills", [])),
            "valid_experience_level": job_data.get("experience_level") in ["entry", "mid", "senior", "lead"],
            "valid_employment_type": job_data.get("employment_type") in ["full_time", "part_time", "contract", "internship"],
            "valid_salary_range": JobValidator._validate_salary_range(job_data.get("salary_min"), job_data.get("salary_max"))
        }
        
        validations["is_valid"] = all(validations.values())
        return validations
    
    @staticmethod
    def _validate_salary_range(salary_min: Optional[int], salary_max: Optional[int]) -> bool:
        """Validate salary range"""
        if salary_min is None and salary_max is None:
            return True  # Optional field
        
        if salary_min is not None and salary_max is not None:
            return salary_min > 0 and salary_max > salary_min
        
        if salary_min is not None:
            return salary_min > 0
        
        if salary_max is not None:
            return salary_max > 0
        
        return True

class APIValidator:
    """API request validation utilities"""
    
    @staticmethod
    def validate_pagination(skip: int, limit: int) -> Dict[str, Any]:
        """Validate pagination parameters"""
        return {
            "valid_skip": skip >= 0,
            "valid_limit": 1 <= limit <= 100,
            "skip": skip,
            "limit": limit
        }
    
    @staticmethod
    def validate_search_query(query: str) -> Dict[str, Any]:
        """Validate search query"""
        return {
            "valid_length": 1 <= len(query.strip()) <= 100,
            "no_sql_injection": not APIValidator._has_sql_injection_patterns(query),
            "no_xss": not APIValidator._has_xss_patterns(query),
            "query": query.strip()
        }
    
    @staticmethod
    def _has_sql_injection_patterns(text: str) -> bool:
        """Check for SQL injection patterns"""
        sql_patterns = [
            r"(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)",
            r"(\b(OR|AND)\s+\d+\s*=\s*\d+)",
            r"(--|#|/\*|\*/)",
            r"(\bxp_cmdshell\b)"
        ]
        
        text_upper = text.upper()
        return any(re.search(pattern, text_upper, re.IGNORECASE) for pattern in sql_patterns)
    
    @staticmethod
    def _has_xss_patterns(text: str) -> bool:
        """Check for XSS patterns"""
        xss_patterns = [
            r"<script[^>]*>.*?</script>",
            r"javascript:",
            r"on\w+\s*=",
            r"<iframe[^>]*>",
            r"<object[^>]*>",
            r"<embed[^>]*>"
        ]
        
        return any(re.search(pattern, text, re.IGNORECASE) for pattern in xss_patterns)

# Utility functions
def validate_required_fields(data: Dict, required_fields: List[str]) -> Dict[str, Any]:
    """Validate that all required fields are present and not empty"""
    validations = {}
    
    for field in required_fields:
        value = data.get(field)
        validations[f"has_{field}"] = value is not None and str(value).strip() != ""
    
    validations["all_required_present"] = all(validations.values())
    return validations

def sanitize_input(text: str, max_length: int = 1000) -> str:
    """Sanitize text input"""
    if not isinstance(text, str):
        return ""
    
    # Remove null bytes and control characters
    text = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', text)
    
    # Trim whitespace
    text = text.strip()
    
    # Limit length
    if len(text) > max_length:
        text = text[:max_length]
    
    return text