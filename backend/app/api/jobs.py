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
    experience: str
    required_skills: List[str]
    key_responsibilities: List[str]
    recruiter_id: str  # MongoDB ObjectId as string
    recruiter_email: str
    recruiter_name: str
    organization_name: str

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
    experience: Optional[str] = None
    required_skills: Optional[List[str]] = None
    key_responsibilities: Optional[List[str]] = None
    is_active: Optional[bool] = None

# Helper function to convert MongoDB document to dict
def job_helper(job) -> dict:
    """Convert MongoDB job document to dict with string IDs"""
    return {
        "id": str(job["_id"]),
        "title": job.get("title", ""),
        "experience": job.get("experience", ""),
        "required_skills": job.get("required_skills", []),
        "key_responsibilities": job.get("key_responsibilities", []),
        "created_by": str(job.get("created_by", "")),  # Convert ObjectId to string
        "recruiter_email": job.get("recruiter_email", ""),
        "recruiter_name": job.get("recruiter_name", ""),
        "organization_name": job.get("organization_name", ""),
        "is_active": job.get("is_active", True),
        "views": job.get("views", 0),
        "applications": job.get("applications", 0),
        "created_at": job.get("created_at", ""),
        "updated_at": job.get("updated_at", ""),
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
        job_document = {
            "title": job_data.title,
            "experience": job_data.experience,
            "required_skills": job_data.required_skills,
            "key_responsibilities": job_data.key_responsibilities,
            "created_by": recruiter_object_id,  # Foreign key to users collection
            "recruiter_email": job_data.recruiter_email,
            "recruiter_name": job_data.recruiter_name,
            "organization_name": job_data.organization_name,
            "is_active": True,
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
    limit: int = 100
):
    """Get all job postings from MongoDB"""
    try:
        mongodb = get_mongo_db()
        
        if mongodb is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database not available"
            )
        
        jobs_collection = mongodb["jobs"]
        
        # Build query
        query = {}
        if active_only:
            query["is_active"] = True
        
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
    """Get all jobs created by a specific recruiter"""
    try:
        mongodb = get_mongo_db()
        
        if mongodb is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database not available"
            )
        
        jobs_collection = mongodb["jobs"]
        
        # Find all jobs by this recruiter
        jobs_cursor = jobs_collection.find({"recruiter_email": recruiter_email}).sort("created_at", -1)
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
async def delete_job(job_id: str):
    """Delete job posting (soft delete by setting is_active to False)"""
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
        
        # Soft delete - set is_active to False
        result = await jobs_collection.update_one(
            {"_id": job_object_id},
            {"$set": {"is_active": False, "updated_at": datetime.utcnow().isoformat()}}
        )
        
        if result.matched_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Job not found"
            )
        
        return {
            "success": True,
            "message": "Job deleted successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting job: {type(e).__name__}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting job: {str(e)}"
        )