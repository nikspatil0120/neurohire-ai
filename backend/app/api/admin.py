from fastapi import APIRouter, HTTPException, status
from typing import Dict, List, Optional
from datetime import datetime, timedelta

router = APIRouter(prefix="/admin", tags=["admin"])

@router.get("/stats")
async def get_admin_stats():
    """Get admin dashboard statistics"""
    try:
        from ..core.database import get_mongo_db
        
        mongo_db = get_mongo_db()
        
        if mongo_db is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database not available"
            )
        
        users_coll = mongo_db["users"]
        jobs_coll = mongo_db["jobs"]
        applications_coll = mongo_db["applications"]
        
        # Count users by role
        total_recruiters = await users_coll.count_documents({"role": "recruiter"})
        total_candidates = await users_coll.count_documents({"role": "candidate"})
        total_admins = await users_coll.count_documents({"role": "admin"})
        
        # Count active sessions (users with recent lastLogin - within last 24 hours)
        yesterday = datetime.utcnow() - timedelta(days=1)
        active_sessions = await users_coll.count_documents({
            "last_login": {"$gte": yesterday}
        })
        
        # Count total jobs
        total_jobs = await jobs_coll.count_documents({})
        published_jobs = await jobs_coll.count_documents({"status": "published"})
        
        # Count total applications
        total_applications = await applications_coll.count_documents({})
        pending_applications = await applications_coll.count_documents({
            "application_status": {"$in": ["applied", "test_pending"]}
        })
        selected_applications = await applications_coll.count_documents({
            "application_status": {"$in": ["selected", "offer_accepted", "hired"]}
        })
        
        # Content bank metrics
        problems_coll = mongo_db["problems"]
        aptitude_coll = mongo_db["aptitude_questions"]
        total_problems = await problems_coll.count_documents({})
        total_aptitude_questions = await aptitude_coll.count_documents({})
        
        # Abuse tracking (placeholder)
        abuse_alerts = 0
        
        return {
            "total_recruiters": total_recruiters,
            "total_candidates": total_candidates,
            "total_admins": total_admins,
            "active_sessions": active_sessions,
            "abuse_alerts": abuse_alerts,
            "total_jobs": total_jobs,
            "published_jobs": published_jobs,
            "total_applications": total_applications,
            "pending_applications": pending_applications,
            "selected_applications": selected_applications,
            "total_problems": total_problems,
            "total_aptitude_questions": total_aptitude_questions
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching admin stats: {str(e)}"
        )

@router.get("/problems/stats")
async def get_problems_stats():
    """Get DSA problems statistics"""
    try:
        from ..core.database import get_mongo_db
        
        mongo_db = get_mongo_db()
        
        if mongo_db is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database not available"
            )
        
        problems_coll = mongo_db["problems"]
        
        total_problems = await problems_coll.count_documents({})
        published_problems = await problems_coll.count_documents({"published": True})
        draft_problems = await problems_coll.count_documents({"published": False})
        
        # Count by difficulty
        easy_problems = await problems_coll.count_documents({"difficulty": "Easy"})
        medium_problems = await problems_coll.count_documents({"difficulty": "Medium"})
        hard_problems = await problems_coll.count_documents({"difficulty": "Hard"})
        
        return {
            "total_problems": total_problems,
            "published_problems": published_problems,
            "draft_problems": draft_problems,
            "easy_problems": easy_problems,
            "medium_problems": medium_problems,
            "hard_problems": hard_problems
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching problems stats: {str(e)}"
        )

@router.get("/recent-activity")
async def get_recent_activity(limit: int = 20):
    """Get recent system activity"""
    try:
        from ..core.database import get_mongo_db
        
        mongo_db = get_mongo_db()
        
        if mongo_db is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database not available"
            )
        
        users_coll = mongo_db["users"]
        jobs_coll = mongo_db["jobs"]
        applications_coll = mongo_db["applications"]
        
        activities = []
        
        # Recent user registrations
        recent_users = await users_coll.find().sort("created_at", -1).limit(5).to_list(5)
        for user in recent_users:
            activities.append({
                "type": "user_registered",
                "description": f"{user.get('full_name', 'Unknown')} registered as {user.get('role', 'unknown')}",
                "timestamp": user.get("created_at", datetime.utcnow()),
                "icon": "user-plus"
            })
        
        # Recent job posts
        recent_jobs = await jobs_coll.find().sort("created_at", -1).limit(5).to_list(5)
        for job in recent_jobs:
            activities.append({
                "type": "job_posted",
                "description": f"New job posted: {job.get('title', 'Unknown')}",
                "timestamp": job.get("created_at", datetime.utcnow()),
                "icon": "briefcase"
            })
        
        # Recent applications
        recent_apps = await applications_coll.find().sort("applied_at", -1).limit(5).to_list(5)
        for app in recent_apps:
            activities.append({
                "type": "application_submitted",
                "description": f"{app.get('candidate_name', 'Unknown')} applied to {app.get('job_title', 'Unknown')}",
                "timestamp": app.get("applied_at", datetime.utcnow()),
                "icon": "file-text"
            })
        
        # Convert datetime to ISO string before sorting
        for activity in activities:
            ts = activity["timestamp"]
            if isinstance(ts, datetime):
                activity["timestamp"] = ts.isoformat()
            elif isinstance(ts, str):
                activity["timestamp"] = ts
            else:
                activity["timestamp"] = datetime.utcnow().isoformat()
        
        # Sort by timestamp (as strings) and limit
        activities.sort(key=lambda x: x["timestamp"] if isinstance(x["timestamp"], str) else "", reverse=True)
        activities = activities[:limit]
        
        return {"activities": activities}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching recent activity: {str(e)}"
        )

@router.put("/users/{user_id}/toggle-active")
async def toggle_user_active(user_id: str):
    """Toggle user active status"""
    try:
        from ..core.database import get_mongo_db
        from bson import ObjectId
        
        mongo_db = get_mongo_db()
        
        if mongo_db is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database not available"
            )
        
        users_coll = mongo_db["users"]
        
        # Get current user
        user = await users_coll.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Toggle active status
        new_status = not user.get("is_active", True)
        result = await users_coll.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"is_active": new_status}}
        )
        
        if result.modified_count == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to update user status"
            )
        
        return {
            "message": f"User {'activated' if new_status else 'deactivated'} successfully",
            "is_active": new_status
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error toggling user status: {str(e)}"
        )

@router.delete("/users/{user_id}")
async def delete_user(user_id: str):
    """Delete a user (soft delete by deactivating)"""
    try:
        from ..core.database import get_mongo_db
        from bson import ObjectId
        
        mongo_db = get_mongo_db()
        
        if mongo_db is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database not available"
            )
        
        users_coll = mongo_db["users"]
        
        # Soft delete - mark as inactive
        result = await users_coll.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"is_active": False, "deleted_at": datetime.utcnow()}}
        )
        
        if result.modified_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        return {"message": "User deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting user: {str(e)}"
        )


@router.put("/applications/{application_id}/status")
async def update_application_status(application_id: str, status: str):
    """Admin: Update application status"""
    try:
        from ..core.database import get_mongo_db
        from bson import ObjectId
        
        mongo_db = get_mongo_db()
        
        if mongo_db is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database not available"
            )
        
        applications_coll = mongo_db["applications"]
        
        # Valid statuses
        valid_statuses = [
            "applied", "test_pending", "test_started", "test_completed", 
            "interview_pending", "selected", "rejected"
        ]
        
        if status not in valid_statuses:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
            )
        
        result = await applications_coll.update_one(
            {"_id": ObjectId(application_id)},
            {
                "$set": {
                    "application_status": status,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        if result.modified_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Application not found"
            )
        
        return {
            "message": "Application status updated successfully",
            "status": status
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating application status: {str(e)}"
        )

@router.post("/applications/{application_id}/notes")
async def add_application_note(application_id: str, note: str):
    """Admin: Add note to application"""
    try:
        from ..core.database import get_mongo_db
        from bson import ObjectId
        
        mongo_db = get_mongo_db()
        
        if mongo_db is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database not available"
            )
        
        applications_coll = mongo_db["applications"]
        
        note_entry = {
            "text": note,
            "added_by": "admin",
            "added_at": datetime.utcnow()
        }
        
        result = await applications_coll.update_one(
            {"_id": ObjectId(application_id)},
            {"$push": {"admin_notes": note_entry}}
        )
        
        if result.modified_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Application not found"
            )
        
        return {
            "message": "Note added successfully",
            "note": note_entry
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error adding note: {str(e)}"
        )

@router.get("/export/users")
async def export_users(role: Optional[str] = None):
    """Export users data as CSV"""
    try:
        from ..core.database import get_mongo_db
        import csv
        from io import StringIO
        from fastapi.responses import StreamingResponse
        
        mongo_db = get_mongo_db()
        
        if mongo_db is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database not available"
            )
        
        users_coll = mongo_db["users"]
        
        # Build query
        query = {}
        if role:
            query["role"] = role
        
        users = await users_coll.find(query).to_list(1000)
        
        # Create CSV
        output = StringIO()
        writer = csv.writer(output)
        
        # Headers
        writer.writerow(["ID", "Name", "Email", "Role", "Active", "Created At", "Last Login"])
        
        # Data
        for user in users:
            writer.writerow([
                str(user.get("_id", "")),
                user.get("full_name", ""),
                user.get("email", ""),
                user.get("role", ""),
                "Yes" if user.get("is_active", True) else "No",
                user.get("created_at", ""),
                user.get("last_login", "")
            ])
        
        output.seek(0)
        
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename=users_{role or 'all'}_{datetime.utcnow().strftime('%Y%m%d')}.csv"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error exporting users: {str(e)}"
        )

@router.get("/export/applications")
async def export_applications():
    """Export applications data as CSV"""
    try:
        from ..core.database import get_mongo_db
        import csv
        from io import StringIO
        from fastapi.responses import StreamingResponse
        
        mongo_db = get_mongo_db()
        
        if mongo_db is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database not available"
            )
        
        applications_coll = mongo_db["applications"]
        
        applications = await applications_coll.find().to_list(5000)
        
        # Create CSV
        output = StringIO()
        writer = csv.writer(output)
        
        # Headers
        writer.writerow([
            "ID", "Candidate Name", "Candidate Email", "Job Title", 
            "Organization", "Status", "Applied At", "Slot Date", "Slot Time"
        ])
        
        # Data
        for app in applications:
            writer.writerow([
                str(app.get("_id", "")),
                app.get("candidate_name", ""),
                app.get("candidate_email", ""),
                app.get("job_title", ""),
                app.get("organization_name", ""),
                app.get("application_status", ""),
                app.get("applied_at", ""),
                app.get("slot_date", ""),
                app.get("slot_start_time", "")
            ])
        
        output.seek(0)
        
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename=applications_{datetime.utcnow().strftime('%Y%m%d')}.csv"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error exporting applications: {str(e)}"
        )

@router.get("/applications")
async def get_admin_applications(limit: int = 100, skip: int = 0, status_filter: Optional[str] = None):
    """Get applications with admin view"""
    try:
        from ..core.database import get_mongo_db
        
        mongo_db = get_mongo_db()
        
        if mongo_db is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database not available"
            )
        
        applications_coll = mongo_db["applications"]
        
        # Build query filter
        query_filter = {}
        if status_filter and status_filter != "all":
            query_filter["application_status"] = status_filter
        
        # Get applications
        applications = await applications_coll.find(query_filter).sort("applied_at", -1).skip(skip).limit(limit).to_list(limit)
        total = await applications_coll.count_documents(query_filter)
        
        # Convert ObjectId to string for JSON serialization
        for app in applications:
            app["_id"] = str(app.get("_id", ""))
        
        return {
            "applications": applications,
            "total": total,
            "count": len(applications),
            "limit": limit,
            "skip": skip
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching applications: {str(e)}"
        )

