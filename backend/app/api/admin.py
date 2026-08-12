from fastapi import APIRouter, HTTPException, status
from typing import Dict
from datetime import datetime

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
        
        # Count users by role
        total_recruiters = await users_coll.count_documents({"role": "recruiter"})
        total_candidates = await users_coll.count_documents({"role": "candidate"})
        total_admins = await users_coll.count_documents({"role": "admin"})
        
        # Count active sessions (users with recent lastLogin - within last 24 hours)
        from datetime import timedelta
        yesterday = datetime.utcnow() - timedelta(days=1)
        active_sessions = await users_coll.count_documents({
            "last_login": {"$gte": yesterday}
        })
        
        # For now, abuse alerts is placeholder (would need abuse tracking collection)
        abuse_alerts = 0
        
        return {
            "total_recruiters": total_recruiters,
            "total_candidates": total_candidates,
            "total_admins": total_admins,
            "active_sessions": active_sessions,
            "abuse_alerts": abuse_alerts
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
