from typing import Dict, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from datetime import datetime, timedelta
import logging

from app.models.interview import Interview
from app.models.user import User
from app.models.job import Job
from app.core.database import get_mongo_db
from app.ai.orchestrator import InterviewOrchestrator

logger = logging.getLogger(__name__)

class InterviewService:
    def __init__(self):
        self.orchestrator = InterviewOrchestrator()
    
    async def schedule_interview(
        self, 
        db: AsyncSession, 
        candidate_id: int, 
        job_id: int, 
        scheduled_at: datetime
    ) -> Optional[Interview]:
        """Schedule a new interview"""
        try:
            # Verify job exists and is active
            job_result = await db.execute(select(Job).where(Job.id == job_id, Job.is_active == True))
            job = job_result.scalar_one_or_none()
            
            if not job:
                logger.error(f"Job {job_id} not found or inactive")
                return None
            
            # Check if candidate already has an interview for this job
            existing_result = await db.execute(
                select(Interview).where(
                    and_(
                        Interview.candidate_id == candidate_id,
                        Interview.job_id == job_id,
                        Interview.status.in_(["scheduled", "in_progress"])
                    )
                )
            )
            
            if existing_result.scalar_one_or_none():
                logger.error(f"Candidate {candidate_id} already has an active interview for job {job_id}")
                return None
            
            # Create interview
            interview = Interview(
                candidate_id=candidate_id,
                job_id=job_id,
                scheduled_at=scheduled_at,
                status="scheduled"
            )
            
            db.add(interview)
            await db.commit()
            await db.refresh(interview)
            
            logger.info(f"Interview scheduled: {interview.id}")
            return interview
            
        except Exception as e:
            logger.error(f"Error scheduling interview: {e}")
            await db.rollback()
            return None
    
    async def start_interview_session(
        self, 
        db: AsyncSession, 
        interview_id: int, 
        candidate_id: int
    ) -> Optional[Dict]:
        """Start an interview session"""
        try:
            # Get interview
            result = await db.execute(
                select(Interview).where(
                    and_(
                        Interview.id == interview_id,
                        Interview.candidate_id == candidate_id,
                        Interview.status == "scheduled"
                    )
                )
            )
            interview = result.scalar_one_or_none()
            
            if not interview:
                logger.error(f"Interview {interview_id} not found or not available for candidate {candidate_id}")
                return None
            
            # Get job details
            job_result = await db.execute(select(Job).where(Job.id == interview.job_id))
            job = job_result.scalar_one()
            
            # Generate session ID
            session_id = f"interview_{interview_id}_{int(datetime.utcnow().timestamp())}"
            
            # Prepare job data for AI
            job_data = {
                "requirements": job.requirements,
                "skills": job.skills,
                "title": job.title,
                "experience_level": job.experience_level
            }
            
            # Start AI interview
            ai_response = await self.orchestrator.start_interview(session_id, job_data)
            
            if not ai_response.get("session_initialized"):
                logger.error(f"Failed to initialize AI session for interview {interview_id}")
                return None
            
            # Update interview status
            interview.status = "in_progress"
            interview.started_at = datetime.utcnow()
            await db.commit()
            
            # Create session in MongoDB
            mongo_db = get_mongo_db()
            session_data = {
                "session_id": session_id,
                "interview_id": interview_id,
                "candidate_id": candidate_id,
                "job_id": job.id,
                "started_at": datetime.utcnow(),
                "status": "active",
                "questions": [ai_response["question"]],
                "responses": [],
                "behavioral_metrics": {
                    "emotion_history": [],
                    "voice_analysis": [],
                    "engagement_scores": []
                }
            }
            
            await mongo_db.interview_sessions.insert_one(session_data)
            
            return {
                "session_id": session_id,
                "first_question": ai_response["question"],
                "audio_url": ai_response.get("audio_url"),
                "interview_id": interview_id
            }
            
        except Exception as e:
            logger.error(f"Error starting interview session: {e}")
            await db.rollback()
            return None
    
    async def complete_interview(
        self, 
        db: AsyncSession, 
        interview_id: int, 
        candidate_id: int
    ) -> Optional[Dict]:
        """Complete an interview and calculate final scores"""
        try:
            # Get interview
            result = await db.execute(
                select(Interview).where(
                    and_(
                        Interview.id == interview_id,
                        Interview.candidate_id == candidate_id,
                        Interview.status == "in_progress"
                    )
                )
            )
            interview = result.scalar_one_or_none()
            
            if not interview:
                logger.error(f"Interview {interview_id} not found or not in progress")
                return None
            
            # Get session data from MongoDB
            mongo_db = get_mongo_db()
            session_data = await mongo_db.interview_sessions.find_one({
                "interview_id": interview_id
            })
            
            if not session_data:
                logger.error(f"Session data not found for interview {interview_id}")
                return None
            
            # Calculate final scores
            final_scores = await self.orchestrator.calculate_final_scores(
                session_data["session_id"], 
                session_data
            )
            
            # Update interview with scores
            interview.status = "completed"
            interview.completed_at = datetime.utcnow()
            interview.technical_score = final_scores.get("technical_score", 0)
            interview.communication_score = final_scores.get("communication_score", 0)
            interview.confidence_score = final_scores.get("confidence_score", 0)
            interview.overall_score = final_scores.get("final_score", 0)
            
            await db.commit()
            
            # Update session in MongoDB
            await mongo_db.interview_sessions.update_one(
                {"interview_id": interview_id},
                {
                    "$set": {
                        "completed_at": datetime.utcnow(),
                        "status": "completed",
                        "final_scores": final_scores
                    }
                }
            )
            
            logger.info(f"Interview {interview_id} completed with score {interview.overall_score}")
            
            return {
                "interview_id": interview_id,
                "scores": final_scores,
                "completed_at": interview.completed_at
            }
            
        except Exception as e:
            logger.error(f"Error completing interview: {e}")
            await db.rollback()
            return None
    
    async def get_interview_report(
        self, 
        db: AsyncSession, 
        interview_id: int, 
        user_id: int, 
        user_role: str
    ) -> Optional[Dict]:
        """Get detailed interview report"""
        try:
            # Get interview with permissions check
            query = select(Interview).where(Interview.id == interview_id)
            
            if user_role == "candidate":
                query = query.where(Interview.candidate_id == user_id)
            elif user_role == "recruiter":
                # Recruiters can see reports for their jobs
                query = query.join(Job).where(Job.created_by == user_id)
            # Admins can see all reports
            
            result = await db.execute(query)
            interview = result.scalar_one_or_none()
            
            if not interview:
                return None
            
            # Get session data from MongoDB
            mongo_db = get_mongo_db()
            session_data = await mongo_db.interview_sessions.find_one({
                "interview_id": interview_id
            })
            
            # Build report
            report = {
                "interview_id": interview_id,
                "status": interview.status,
                "scheduled_at": interview.scheduled_at,
                "started_at": interview.started_at,
                "completed_at": interview.completed_at,
                "scores": {
                    "technical_score": interview.technical_score,
                    "communication_score": interview.communication_score,
                    "confidence_score": interview.confidence_score,
                    "overall_score": interview.overall_score
                }
            }
            
            if session_data:
                report.update({
                    "questions_asked": len(session_data.get("questions", [])),
                    "responses_given": len(session_data.get("responses", [])),
                    "session_duration": self._calculate_session_duration(session_data),
                    "behavioral_insights": self._analyze_behavioral_metrics(session_data),
                    "performance_summary": session_data.get("final_scores", {}).get("session_summary", {})
                })
            
            return report
            
        except Exception as e:
            logger.error(f"Error getting interview report: {e}")
            return None
    
    async def get_candidate_interviews(
        self, 
        db: AsyncSession, 
        candidate_id: int, 
        status: Optional[str] = None
    ) -> List[Interview]:
        """Get all interviews for a candidate"""
        try:
            query = select(Interview).where(Interview.candidate_id == candidate_id)
            
            if status:
                query = query.where(Interview.status == status)
            
            result = await db.execute(query)
            return result.scalars().all()
            
        except Exception as e:
            logger.error(f"Error getting candidate interviews: {e}")
            return []
    
    async def get_job_interviews(
        self, 
        db: AsyncSession, 
        job_id: int, 
        recruiter_id: Optional[int] = None
    ) -> List[Interview]:
        """Get all interviews for a job"""
        try:
            query = select(Interview).where(Interview.job_id == job_id)
            
            # If recruiter_id provided, verify they own the job
            if recruiter_id:
                query = query.join(Job).where(Job.created_by == recruiter_id)
            
            result = await db.execute(query)
            return result.scalars().all()
            
        except Exception as e:
            logger.error(f"Error getting job interviews: {e}")
            return []
    
    def _calculate_session_duration(self, session_data: Dict) -> Optional[int]:
        """Calculate session duration in minutes"""
        started_at = session_data.get("started_at")
        completed_at = session_data.get("completed_at")
        
        if started_at and completed_at:
            duration = completed_at - started_at
            return int(duration.total_seconds() / 60)
        
        return None
    
    def _analyze_behavioral_metrics(self, session_data: Dict) -> Dict:
        """Analyze behavioral metrics from session"""
        behavioral_metrics = session_data.get("behavioral_metrics", {})
        
        emotion_history = behavioral_metrics.get("emotion_history", [])
        voice_analysis = behavioral_metrics.get("voice_analysis", [])
        
        insights = {
            "average_confidence": 0,
            "stress_level": "low",
            "engagement_level": "medium",
            "dominant_emotions": []
        }
        
        if emotion_history:
            # Calculate average confidence from emotions
            confidences = [e.get("confidence", 0) for e in emotion_history]
            insights["average_confidence"] = sum(confidences) / len(confidences) if confidences else 0
            
            # Find dominant emotions
            emotion_counts = {}
            for emotion_data in emotion_history:
                dominant = emotion_data.get("dominant_emotion", "neutral")
                emotion_counts[dominant] = emotion_counts.get(dominant, 0) + 1
            
            insights["dominant_emotions"] = sorted(
                emotion_counts.items(), 
                key=lambda x: x[1], 
                reverse=True
            )[:3]
        
        if voice_analysis:
            # Analyze voice confidence
            voice_confidences = [v.get("confidence", 0) for v in voice_analysis]
            avg_voice_confidence = sum(voice_confidences) / len(voice_confidences) if voice_confidences else 0
            
            if avg_voice_confidence > 0.7:
                insights["stress_level"] = "low"
            elif avg_voice_confidence > 0.4:
                insights["stress_level"] = "medium"
            else:
                insights["stress_level"] = "high"
        
        return insights