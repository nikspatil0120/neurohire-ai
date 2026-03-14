from sqlalchemy import Column, String, DateTime, Numeric, Integer
from sqlalchemy.sql import func
from app.core.database import Base

class Interview(Base):
    __tablename__ = "interviews"
    
    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, nullable=False)  # Foreign key to User
    job_id = Column(Integer, nullable=False)  # Foreign key to Job
    status = Column(String(50), default="scheduled")
    scheduled_at = Column(DateTime(timezone=True), nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    technical_score = Column(Numeric(5, 2), nullable=True)
    communication_score = Column(Numeric(5, 2), nullable=True)
    confidence_score = Column(Numeric(5, 2), nullable=True)
    overall_score = Column(Numeric(5, 2), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())