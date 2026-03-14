from typing import Optional, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from passlib.context import CryptContext
from datetime import datetime, timedelta
import jwt
import logging

from app.models.user import User
from app.config import settings

logger = logging.getLogger(__name__)

class AuthService:
    def __init__(self):
        self.pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify password against hash"""
        return self.pwd_context.verify(plain_password, hashed_password)
    
    def get_password_hash(self, password: str) -> str:
        """Hash password"""
        return self.pwd_context.hash(password)
    
    def create_access_token(self, data: dict, expires_delta: Optional[timedelta] = None) -> str:
        """Create JWT access token"""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        return encoded_jwt
    
    def verify_token(self, token: str) -> Optional[Dict]:
        """Verify JWT token and return payload"""
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            return payload
        except jwt.PyJWTError as e:
            logger.error(f"Token verification failed: {e}")
            return None
    
    async def authenticate_user(self, db: AsyncSession, email: str, password: str) -> Optional[User]:
        """Authenticate user with email and password"""
        try:
            result = await db.execute(select(User).where(User.email == email))
            user = result.scalar_one_or_none()
            
            if not user:
                return None
            
            if not self.verify_password(password, user.hashed_password):
                return None
            
            # Update last login
            user.last_login = datetime.utcnow()
            await db.commit()
            
            return user
            
        except Exception as e:
            logger.error(f"Authentication error: {e}")
            return None
    
    async def get_user_by_email(self, db: AsyncSession, email: str) -> Optional[User]:
        """Get user by email"""
        try:
            result = await db.execute(select(User).where(User.email == email))
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error getting user by email: {e}")
            return None
    
    async def create_user(self, db: AsyncSession, user_data: Dict) -> Optional[User]:
        """Create new user"""
        try:
            # Hash password
            hashed_password = self.get_password_hash(user_data["password"])
            
            # Create user
            db_user = User(
                email=user_data["email"],
                full_name=user_data["full_name"],
                hashed_password=hashed_password,
                role=user_data.get("role", "candidate")
            )
            
            db.add(db_user)
            await db.commit()
            await db.refresh(db_user)
            
            return db_user
            
        except Exception as e:
            logger.error(f"Error creating user: {e}")
            await db.rollback()
            return None
    
    def validate_password_strength(self, password: str) -> Dict[str, bool]:
        """Validate password strength"""
        validations = {
            "min_length": len(password) >= 8,
            "has_upper": any(c.isupper() for c in password),
            "has_lower": any(c.islower() for c in password),
            "has_digit": any(c.isdigit() for c in password),
            "has_special": any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password)
        }
        
        validations["is_strong"] = all(validations.values())
        return validations
    
    async def change_password(
        self, 
        db: AsyncSession, 
        user: User, 
        old_password: str, 
        new_password: str
    ) -> bool:
        """Change user password"""
        try:
            # Verify old password
            if not self.verify_password(old_password, user.hashed_password):
                return False
            
            # Validate new password
            validation = self.validate_password_strength(new_password)
            if not validation["is_strong"]:
                return False
            
            # Update password
            user.hashed_password = self.get_password_hash(new_password)
            await db.commit()
            
            return True
            
        except Exception as e:
            logger.error(f"Error changing password: {e}")
            await db.rollback()
            return False
    
    async def reset_password(self, db: AsyncSession, email: str) -> Optional[str]:
        """Generate password reset token"""
        try:
            user = await self.get_user_by_email(db, email)
            if not user:
                return None
            
            # Create reset token (expires in 1 hour)
            reset_token = self.create_access_token(
                data={"sub": user.email, "type": "password_reset"},
                expires_delta=timedelta(hours=1)
            )
            
            # In a real app, you'd send this via email
            logger.info(f"Password reset token generated for {email}")
            return reset_token
            
        except Exception as e:
            logger.error(f"Error generating reset token: {e}")
            return None
    
    async def confirm_password_reset(
        self, 
        db: AsyncSession, 
        token: str, 
        new_password: str
    ) -> bool:
        """Confirm password reset with token"""
        try:
            # Verify token
            payload = self.verify_token(token)
            if not payload or payload.get("type") != "password_reset":
                return False
            
            email = payload.get("sub")
            if not email:
                return False
            
            # Get user
            user = await self.get_user_by_email(db, email)
            if not user:
                return False
            
            # Validate new password
            validation = self.validate_password_strength(new_password)
            if not validation["is_strong"]:
                return False
            
            # Update password
            user.hashed_password = self.get_password_hash(new_password)
            await db.commit()
            
            return True
            
        except Exception as e:
            logger.error(f"Error confirming password reset: {e}")
            await db.rollback()
            return False