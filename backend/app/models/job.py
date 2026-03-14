from sqlalchemy import Column, String, Text, DateTime, ARRAY, Integer, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class Job(Base):
    __tablename__ = "jobs"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    requirements = Column(ARRAY(String), nullable=False)
    skills = Column(ARRAY(String), nullable=False)
    experience_level = Column(String(50), nullable=False)
    employment_type = Column(String(50), nullable=False)
    department = Column(String(100), nullable=True)
    salary_min = Column(Integer, nullable=True)
    salary_max = Column(Integer, nullable=True)
    created_by = Column(Integer, nullable=False)  # Foreign key to User
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())