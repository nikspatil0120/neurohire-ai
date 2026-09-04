from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from pydantic import BaseModel
from bson import ObjectId
from datetime import datetime
import logging

from app.core.database import get_mongo_db

router = APIRouter(prefix="/jobs", tags=["jobs"])
logger = logging.getLogger(__name__)

# Pydantic models for request/response
class JobCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    experience: str
    vacancies: Optional[int] = None
    required_skills: List[str]
    key_responsibilities: List[str]
    recruiter_id: str
    recruiter_email: str
    recruiter_name: str
    organization_name: str
    status: Optional[str] = "draft"
    start_date: Optional[str] = None   # ISO date string e.g. "2026-09-01"
    end_date: Optional[str] = None     # ISO date string e.g. "2026-09-15"
    aptitude_questions: Optional[List] = []
    coding_problems: Optional[List] = []
    aptitude_threshold: Optional[int] = None
    aptitude_duration: Optional[int] = None
    aptitude_priority: Optional[int] = None
    coding_priority: Optional[int] = None

class JobResponse(BaseModel):
    id: str
    title: str
    experience: str
    required_skills: List[str]
    key_responsibilities: List[str]
    recruiter_email: str
    recruiter_name: str
    organization_name: str
    is_active: bool
    created_at: str
    updated_at: str

class JobUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    experience: Optional[str] = None
    vacancies: Optional[int] = None
    required_skills: Optional[List[str]] = None
    key_responsibilities: Optional[List[str]] = None
    is_active: Optional[bool] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    aptitude_questions: Optional[List] = None
    coding_problems: Optional[List] = None
    aptitude_threshold: Optional[int] = None
    aptitude_duration: Optional[int] = None
    aptitude_priority: Optional[int] = None
    coding_priority: Optional[int] = None

class JobStatusUpdate(BaseModel):
    status: str  # "draft" or "published"

# Helper function to convert MongoDB document to dict
def job_helper(job) -> dict:
    """Convert MongoDB job document to dict with string IDs"""
    # Derive computed status considering validity dates
    raw_status = job.get("status", "draft")
    end_date = job.get("end_date")
    is_active = job.get("is_active", True)

    computed_status = raw_status
    if raw_status == "published" and is_active and end_date:
        try:
            end_dt = datetime.fromisoformat(end_date)
            if datetime.utcnow() > end_dt:
                computed_status = "expired"
        except Exception:
            pass

    return {
        "_id": str(job["_id"]),
        "id": str(job["_id"]),
        "title": job.get("title", ""),
        "description": job.get("description", ""),
        "experience": job.get("experience", ""),
        "vacancies": job.get("vacancies", None),
        "required_skills": job.get("required_skills", []),
        "key_responsibilities": job.get("key_responsibilities", []),
        "created_by": str(job.get("created_by", "")),
        "recruiter_id": str(job.get("created_by", "")),
        "recruiter_email": job.get("recruiter_email", ""),
        "recruiter_name": job.get("recruiter_name", ""),
        "organization_name": job.get("organization_name", ""),
        "status": computed_status,
        "is_active": is_active,
        "start_date": job.get("start_date"),
        "end_date": job.get("end_date"),
        "deleted_by_recruiter": job.get("deleted_by_recruiter", False),
        "admin_deleted": job.get("admin_deleted", False),
        "candidates_deleted": job.get("candidates_deleted", False),
        "aptitude_questions": job.get("aptitude_questions", []),
        "coding_problems": job.get("coding_problems", []),
        "aptitude_threshold": job.get("aptitude_threshold", None),
        "aptitude_duration": job.get("aptitude_duration", None),
        "aptitude_priority": job.get("aptitude_priority", None),
        "coding_priority": job.get("coding_priority", None),
        "views": job.get("views", 0),
        "applications": job.get("applications", 0),
        "created_at": job.get("created_at", ""),
        "updated_at": job.get("updated_at", ""),
        "company_logo": "",
    }

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_job(job_data: JobCreate):
    """Create new job posting in MongoDB"""
    try:
        mongodb = get_mongo_db()
        
        if mongodb is None:
            logger.error("MongoDB database connection is None")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database not available"
            )
        
        jobs_collection = mongodb["jobs"]
        
        # Convert recruiter_id string to ObjectId for foreign key reference
        try:
            recruiter_object_id = ObjectId(job_data.recruiter_id)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid recruiter_id format: {str(e)}"
            )
        
        # Prepare job document
        current_time = datetime.utcnow().isoformat()
        is_active = job_data.status == "published" if job_data.status else True
        job_document = {
            "title": job_data.title,
            "description": job_data.description or "",
            "experience": job_data.experience,
            "vacancies": job_data.vacancies,
            "required_skills": job_data.required_skills,
            "key_responsibilities": job_data.key_responsibilities,
            "created_by": recruiter_object_id,
            "recruiter_email": job_data.recruiter_email,
            "recruiter_name": job_data.recruiter_name,
            "organization_name": job_data.organization_name,
            "status": job_data.status or "draft",
            "is_active": is_active,
            "start_date": job_data.start_date,
            "end_date": job_data.end_date,
            "aptitude_questions": job_data.aptitude_questions or [],
            "coding_problems": job_data.coding_problems or [],
            "aptitude_threshold": job_data.aptitude_threshold,
            "aptitude_duration": job_data.aptitude_duration,
            "aptitude_priority": job_data.aptitude_priority,
            "coding_priority": job_data.coding_priority,
            "views": 0,
            "applications": 0,
            "created_at": current_time,
            "updated_at": current_time
        }
        
        # Insert into MongoDB
        result = await jobs_collection.insert_one(job_document)
        
        # Get the created job
        created_job = await jobs_collection.find_one({"_id": result.inserted_id})
        
        logger.info(f"Job created successfully: {result.inserted_id}")
        
        return {
            "success": True,
            "message": "Job created successfully",
            "job": job_helper(created_job)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating job: {type(e).__name__}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating job: {str(e)}"
        )

@router.get("/", response_model=List[JobResponse])
async def get_all_jobs(
    active_only: bool = True,
    skip: int = 0,
    limit: int = 100,
    user_type: Optional[str] = None  # "admin", "candidate", or "recruiter"
):
    """Get all job postings from MongoDB with visibility logic"""
    try:
        mongodb = get_mongo_db()
        
        if mongodb is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database not available"
            )
        
        jobs_collection = mongodb["jobs"]
        
        # Build query based on user type and visibility logic
        query = {}
        if active_only:
            query["is_active"] = True
        
        # Apply visibility logic based on user type
        if user_type == "admin":
            # Admin: Visible if NOT admin_deleted (regardless of other flags)
            query["admin_deleted"] = {"$ne": True}
        elif user_type == "candidate":
            # Candidate: Visible if NOT candidates_deleted (regardless of other flags)
            query["candidates_deleted"] = {"$ne": True}
        elif user_type == "recruiter":
            # Recruiter: Visibility handled by recruiter-specific endpoint
            pass
        
        # Get jobs with pagination
        jobs_cursor = jobs_collection.find(query).skip(skip).limit(limit).sort("created_at", -1)
        jobs = [job_helper(job) async for job in jobs_cursor]
        
        return jobs
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching jobs: {type(e).__name__}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching jobs: {str(e)}"
        )

@router.get("/recruiter/{recruiter_email}")
async def get_recruiter_jobs(recruiter_email: str):
    """Get all jobs created by a specific recruiter based on visibility logic"""
    try:
        mongodb = get_mongo_db()
        
        if mongodb is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database not available"
            )
        
        jobs_collection = mongodb["jobs"]
        
        # Find all jobs by this recruiter based on visibility logic
        # Visible to recruiter if NOT deleted_by_recruiter (regardless of admin_deleted or candidates_deleted)
        jobs_cursor = jobs_collection.find({
            "recruiter_email": recruiter_email,
            "deleted_by_recruiter": {"$ne": True}
        }).sort("created_at", -1)
        jobs = [job_helper(job) async for job in jobs_cursor]
        
        return {
            "success": True,
            "count": len(jobs),
            "jobs": jobs
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching recruiter jobs: {type(e).__name__}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching recruiter jobs: {str(e)}"
        )

@router.get("/candidate")
async def get_candidate_jobs():
    """Get all jobs visible to candidates based on visibility logic"""
    try:
        mongodb = get_mongo_db()
        
        if mongodb is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database not available"
            )
        
        jobs_collection = mongodb["jobs"]
        
        # Find all jobs visible to candidates: NOT candidates_deleted (regardless of other flags)
        jobs_cursor = jobs_collection.find({
            "candidates_deleted": {"$ne": True},
            "is_active": True
        }).sort("created_at", -1)
        jobs = [job_helper(job) async for job in jobs_cursor]
        
        return {
            "success": True,
            "count": len(jobs),
            "jobs": jobs
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching candidate jobs: {type(e).__name__}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching candidate jobs: {str(e)}"
        )

@router.get("/{job_id}")
async def get_job(job_id: str):
    """Get job by ID"""
    try:
        mongodb = get_mongo_db()
        
        if mongodb is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database not available"
            )
        
        jobs_collection = mongodb["jobs"]
        
        # Convert string to ObjectId
        try:
            job_object_id = ObjectId(job_id)
        except:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid job ID format"
            )
        
        job = await jobs_collection.find_one({"_id": job_object_id})
        
        if not job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Job not found"
            )
        
        # Increment views count
        await jobs_collection.update_one(
            {"_id": job_object_id},
            {"$inc": {"views": 1}}
        )
        
        return job_helper(job)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching job: {type(e).__name__}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching job: {str(e)}"
        )

@router.put("/{job_id}")
async def update_job(job_id: str, job_update: JobUpdate):
    """Update job posting"""
    try:
        mongodb = get_mongo_db()
        
        if mongodb is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database not available"
            )
        
        jobs_collection = mongodb["jobs"]
        
        # Convert string to ObjectId
        try:
            job_object_id = ObjectId(job_id)
        except:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid job ID format"
            )
        
        # Check if job exists
        existing_job = await jobs_collection.find_one({"_id": job_object_id})
        if not existing_job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Job not found"
            )
        
        # Build update document
        update_data = {k: v for k, v in job_update.dict(exclude_unset=True).items()}
        
        if update_data:
            update_data["updated_at"] = datetime.utcnow().isoformat()
            
            result = await jobs_collection.update_one(
                {"_id": job_object_id},
                {"$set": update_data}
            )
            
            if result.modified_count == 0:
                logger.warning(f"Job {job_id} was not modified")
        
        # Get updated job
        updated_job = await jobs_collection.find_one({"_id": job_object_id})
        
        return {
            "success": True,
            "message": "Job updated successfully",
            "job": job_helper(updated_job)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating job: {type(e).__name__}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating job: {str(e)}"
        )

@router.delete("/{job_id}")
async def delete_job(job_id: str, deleteType: Optional[str] = None):
    """Delete job posting with different delete types and visibility logic"""
    try:
        mongodb = get_mongo_db()
        
        if mongodb is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database not available"
            )
        
        jobs_collection = mongodb["jobs"]
        
        # Convert string to ObjectId
        try:
            job_object_id = ObjectId(job_id)
        except:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid job ID format"
            )
        
        # Check if job exists
        existing_job = await jobs_collection.find_one({"_id": job_object_id})
        if not existing_job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Job not found"
            )
        
        # Handle different delete types
        if deleteType == "admin":
            # Delete for admin - visible to candidate + recruiter
            result = await jobs_collection.update_one(
                {"_id": job_object_id},
                {
                    "$set": {
                        "admin_deleted": True,
                        "updated_at": datetime.utcnow().isoformat()
                    }
                }
            )
            message = "Job deleted for admin (visible to candidates and recruiter)"
            
        elif deleteType == "candidates":
            # Delete for candidates - visible to admin + recruiter
            result = await jobs_collection.update_one(
                {"_id": job_object_id},
                {
                    "$set": {
                        "candidates_deleted": True,
                        "updated_at": datetime.utcnow().isoformat()
                    }
                }
            )
            message = "Job deleted for candidates (visible to admin and recruiter)"
            
        elif deleteType == "me":
            # Delete for me (recruiter) - visible to candidate + admin
            result = await jobs_collection.update_one(
                {"_id": job_object_id},
                {
                    "$set": {
                        "deleted_by_recruiter": True,
                        "updated_at": datetime.utcnow().isoformat()
                    }
                }
            )
            message = "Job deleted for me (visible to candidates and admin)"
            
        elif deleteType == "all":
            # Complete deletion from database when all three are selected
            result = await jobs_collection.delete_one({"_id": job_object_id})
            message = "Job completely deleted from database"
            
        else:
            # Default behavior - soft delete
            result = await jobs_collection.update_one(
                {"_id": job_object_id},
                {"$set": {"is_active": False, "updated_at": datetime.utcnow().isoformat()}}
            )
            message = "Job deleted successfully"
        
        # delete_one returns DeleteResult (has deleted_count), update_one returns UpdateResult (has matched_count)
        if deleteType == "all":
            if result.deleted_count == 0:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Job not found"
                )
        else:
            if result.matched_count == 0:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Job not found"
                )
        
        return {
            "success": True,
            "message": message
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting job: {type(e).__name__}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting job: {str(e)}"
        )

@router.patch("/{job_id}/status")
async def update_job_status(job_id: str, status_update: JobStatusUpdate):
    """Update job status (draft/published)"""
    try:
        mongodb = get_mongo_db()
        
        if mongodb is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database not available"
            )
        
        jobs_collection = mongodb["jobs"]
        
        # Convert string to ObjectId
        try:
            job_object_id = ObjectId(job_id)
        except:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid job ID format"
            )
        
        # Check if job exists
        existing_job = await jobs_collection.find_one({"_id": job_object_id})
        if not existing_job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Job not found"
            )
        
        # Update status and is_active
        is_active = status_update.status == "published"
        result = await jobs_collection.update_one(
            {"_id": job_object_id},
            {
                "$set": {
                    "status": status_update.status,
                    "is_active": is_active,
                    "updated_at": datetime.utcnow().isoformat()
                }
            }
        )
        
        if result.matched_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Job not found"
            )
        
        # Get updated job
        updated_job = await jobs_collection.find_one({"_id": job_object_id})
        
        return {
            "success": True,
            "message": f"Job {status_update.status} successfully",
            "job": job_helper(updated_job)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating job status: {type(e).__name__}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating job status: {str(e)}"
        )