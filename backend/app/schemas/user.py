from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    full_name: str

class UserCreate(UserBase):
    password: str
    role: Optional[str] = "candidate"

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class GoogleAuth(BaseModel):
    google_token: str

class UserResponse(UserBase):
    id: str  # Changed from int to str for MongoDB ObjectId
    role: str
    is_active: bool
    created_at: datetime
    last_login: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: Optional[UserResponse] = None

class CandidateProfileBase(BaseModel):
    phone: Optional[str] = None
    skills: Optional[List[str]] = None
    experience_years: Optional[int] = None
    education: Optional[str] = None

class CandidateProfileCreate(CandidateProfileBase):
    pass

class CandidateProfile(CandidateProfileBase):
    user_id: str
    resume_url: Optional[str] = None
    profile_completion: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class RecruiterProfileBase(BaseModel):
    company_name: Optional[str] = None
    company_website: Optional[str] = None

class RecruiterProfileCreate(RecruiterProfileBase):
    pass

class RecruiterProfile(RecruiterProfileBase):
    user_id: str
    jobs_posted: int
    created_at: datetime
    
    class Config:
        from_attributes = True