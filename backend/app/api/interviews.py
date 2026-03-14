from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from datetime import datetime

from app.core.database import get_db, get_mongo_db
from app.models.interview import Interview
from app.models.user import User
from app.models.job import Job
from app.schemas.interview import InterviewCreate, InterviewResponse, InterviewUpdate
from app.api.auth import get_current_user
from app.ai.orchestrator import InterviewOrchestrator

router = APIRouter(prefix="/interviews", tags=["interviews"])

# Initialize AI orchestrator
orchestrator = InterviewOrchestrator()

@router.post("/", response_model=InterviewResponse)
async def create_interview(
    interview_data: InterviewCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create new interview"""
    
    # Verify job exists
    result = await db.execute(select(Job).where(Job.id == interview_data.job_id))
    job = result.scalar_one_or_none()
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    # Create interview
    db_interview = Interview(
        **interview_data.dict(),
        candidate_id=current_user.id,
        status="scheduled"
    )
    
    db.add(db_interview)
    await db.commit()
    await db.refresh(db_interview)
    
    return db_interview

@router.get("/", response_model=List[InterviewResponse])
async def get_interviews(
    skip: int = 0,
    limit: int = 100,
    status: str = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get interviews"""
    query = select(Interview)
    
    # Filter by user role
    if current_user.role == "candidate":
        query = query.where(Interview.candidate_id == current_user.id)
    elif current_user.role == "recruiter":
        # Recruiters can see interviews for their jobs
        query = query.join(Job).where(Job.created_by == current_user.id)
    # Admins can see all interviews
    
    if status:
        query = query.where(Interview.status == status)
    
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    interviews = result.scalars().all()
    
    return interviews

@router.get("/{interview_id}", response_model=InterviewResponse)
async def get_interview(
    interview_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get interview by ID"""
    result = await db.execute(select(Interview).where(Interview.id == interview_id))
    interview = result.scalar_one_or_none()
    
    if not interview:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview not found"
        )
    
    # Check permissions
    if (current_user.role == "candidate" and interview.candidate_id != current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    return interview

@router.post("/{interview_id}/start")
async def start_interview(
    interview_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Start interview session"""
    
    # Get interview
    result = await db.execute(select(Interview).where(Interview.id == interview_id))
    interview = result.scalar_one_or_none()
    
    if not interview:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview not found"
        )
    
    # Check permissions
    if interview.candidate_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    # Check if interview can be started
    if interview.status != "scheduled":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Interview cannot be started. Current status: {interview.status}"
        )
    
    # Get job data
    job_result = await db.execute(select(Job).where(Job.id == interview.job_id))
    job = job_result.scalar_one()
    
    # Start AI interview
    session_id = f"interview_{interview_id}_{int(datetime.utcnow().timestamp())}"
    
    job_data = {
        "requirements": job.requirements,
        "skills": job.skills,
        "title": job.title
    }
    
    ai_response = await orchestrator.start_interview(session_id, job_data)
    
    if ai_response.get("session_initialized"):
        # Update interview status
        interview.status = "in_progress"
        interview.started_at = datetime.utcnow()
        await db.commit()
        
        # Store session data in MongoDB
        mongo_db = get_mongo_db()
        session_data = {
            "session_id": session_id,
            "interview_id": interview_id,
            "candidate_id": current_user.id,
            "job_id": job.id,
            "started_at": datetime.utcnow(),
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
            "audio_url": ai_response["audio_url"],
            "status": "started"
        }
    else:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to start interview session"
        )

@router.post("/{interview_id}/complete")
async def complete_interview(
    interview_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Complete interview and calculate final scores"""
    
    # Get interview
    result = await db.execute(select(Interview).where(Interview.id == interview_id))
    interview = result.scalar_one_or_none()
    
    if not interview:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview not found"
        )
    
    # Check permissions
    if interview.candidate_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    # Get session data from MongoDB
    mongo_db = get_mongo_db()
    session_data = await mongo_db.interview_sessions.find_one({
        "interview_id": interview_id
    })
    
    if not session_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview session not found"
        )
    
    # Calculate final scores
    final_scores = await orchestrator.calculate_final_scores(
        session_data["session_id"], 
        session_data
    )
    
    # Update interview with scores
    interview.status = "completed"
    interview.completed_at = datetime.utcnow()
    interview.technical_score = final_scores["technical_score"]
    interview.communication_score = final_scores["communication_score"]
    interview.confidence_score = final_scores["confidence_score"]
    interview.overall_score = final_scores["final_score"]
    
    await db.commit()
    
    # Update session data in MongoDB
    await mongo_db.interview_sessions.update_one(
        {"interview_id": interview_id},
        {
            "$set": {
                "completed_at": datetime.utcnow(),
                "final_scores": final_scores,
                "status": "completed"
            }
        }
    )
    
    return {
        "interview_id": interview_id,
        "status": "completed",
        "scores": final_scores
    }

@router.get("/{interview_id}/report")
async def get_interview_report(
    interview_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get detailed interview report"""
    
    # Get interview
    result = await db.execute(select(Interview).where(Interview.id == interview_id))
    interview = result.scalar_one_or_none()
    
    if not interview:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview not found"
        )
    
    # Check permissions
    if (current_user.role == "candidate" and interview.candidate_id != current_user.id):
        # Recruiters can view reports for their jobs
        if current_user.role == "recruiter":
            job_result = await db.execute(select(Job).where(Job.id == interview.job_id))
            job = job_result.scalar_one_or_none()
            if not job or job.created_by != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Not enough permissions"
                )
        elif current_user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
    
    # Get session data from MongoDB
    mongo_db = get_mongo_db()
    session_data = await mongo_db.interview_sessions.find_one({
        "interview_id": interview_id
    })
    
    if not session_data:
        return {
            "interview_id": interview_id,
            "status": interview.status,
            "scores": {
                "technical_score": interview.technical_score,
                "communication_score": interview.communication_score,
                "confidence_score": interview.confidence_score,
                "overall_score": interview.overall_score
            },
            "detailed_data": None
        }
    
    return {
        "interview_id": interview_id,
        "status": interview.status,
        "started_at": interview.started_at,
        "completed_at": interview.completed_at,
        "scores": {
            "technical_score": interview.technical_score,
            "communication_score": interview.communication_score,
            "confidence_score": interview.confidence_score,
            "overall_score": interview.overall_score
        },
        "questions_asked": len(session_data.get("questions", [])),
        "responses_given": len(session_data.get("responses", [])),
        "behavioral_metrics": session_data.get("behavioral_metrics", {}),
        "session_summary": session_data.get("final_scores", {}).get("session_summary", {})
    }