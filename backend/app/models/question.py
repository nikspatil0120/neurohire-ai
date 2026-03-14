from sqlalchemy import Column, String, Text, Integer, Boolean, DateTime, ARRAY
from sqlalchemy.sql import func
from app.core.database import Base

class Question(Base):
    __tablename__ = "questions"
    
    id = Column(Integer, primary_key=True, index=True)
    text = Column(Text, nullable=False)
    category = Column(String(100), nullable=False)
    difficulty = Column(Integer, nullable=False)  # 1-5 scale
    question_type = Column(String(50), nullable=False)  # technical, behavioral, etc.
    expected_keywords = Column(ARRAY(String), nullable=True)
    expected_answer = Column(Text, nullable=True)
    created_by = Column(Integer, nullable=True)  # Foreign key to User
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())