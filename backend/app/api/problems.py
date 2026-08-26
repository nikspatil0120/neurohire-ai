from fastapi import APIRouter, HTTPException, status
from typing import List, Optional
from datetime import datetime
from bson import ObjectId
from ..models.problem import Problem, ProblemCreate, ProblemUpdate
from ..core import database

router = APIRouter(prefix="/problems", tags=["problems"])

def problem_helper(problem) -> dict:
    """Convert MongoDB document to dictionary"""
    def convert_objectid(obj):
        """Recursively convert ObjectId to string in nested structures"""
        if isinstance(obj, ObjectId):
            return str(obj)
        elif isinstance(obj, dict):
            return {k: convert_objectid(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [convert_objectid(item) for item in obj]
        else:
            return obj
    
    return {
        "id": str(problem["_id"]),
        "title": problem.get("title", ""),
        "difficulty": problem.get("difficulty", "Easy"),
        "tags": convert_objectid(problem.get("tags", [])),
        "companies": convert_objectid(problem.get("companies", [])),
        "description": problem.get("description", ""),
        "examples": convert_objectid(problem.get("examples", [])),
        "constraints": convert_objectid(problem.get("constraints", [])),
        "testCases": convert_objectid(problem.get("testCases", [])),
        "codeTemplates": convert_objectid(problem.get("codeTemplates", {})),
        "functionSignatures": convert_objectid(problem.get("functionSignatures")),
        "stats": convert_objectid(problem.get("stats", {})),
        "published": problem.get("published", False),
        "createdAt": problem.get("createdAt"),
        "updatedAt": problem.get("updatedAt")
    }

@router.get("/")
async def get_all_problems(published_only: Optional[bool] = None):
    """Get all problems (admin) or only published problems (candidates)"""
    try:
        from ..core.database import get_mongo_db
        
        mongodb = get_mongo_db()
        
        if mongodb is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database not available"
            )
        
        problems_coll = mongodb["problems"]
        
        query = {}
        if published_only:
            query["published"] = True
        
        problems = []
        async for problem in problems_coll.find(query):
            problems.append(problem_helper(problem))
        
        return problems
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching problems: {str(e)}"
        )

@router.get("/{problem_id}")
async def get_problem(problem_id: str):
    """Get a single problem by ID"""
    try:
        from ..core.database import get_mongo_db
        
        mongodb = get_mongo_db()
        
        if not ObjectId.is_valid(problem_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid problem ID"
            )
        
        problems_coll = mongodb["problems"]
        problem = await problems_coll.find_one({"_id": ObjectId(problem_id)})
        if not problem:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Problem not found"
            )
        
        return problem_helper(problem)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching problem: {str(e)}"
        )

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_problem(problem: ProblemCreate):
    """Create a new problem (admin only)"""
    try:
        from ..core.database import get_mongo_db
        
        mongodb = get_mongo_db()
        problems_coll = mongodb["problems"]
        problem_dict = problem.dict()
        problem_dict["createdAt"] = datetime.utcnow()
        problem_dict["updatedAt"] = datetime.utcnow()
        
        result = await problems_coll.insert_one(problem_dict)
        created_problem = await problems_coll.find_one({"_id": result.inserted_id})
        
        return problem_helper(created_problem)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating problem: {str(e)}"
        )

@router.put("/{problem_id}")
async def update_problem(problem_id: str, problem_update: ProblemUpdate):
    """Update a problem (admin only)"""
    try:
        from ..core.database import get_mongo_db
        
        mongodb = get_mongo_db()
        
        if not ObjectId.is_valid(problem_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid problem ID"
            )
        
        # Get existing problem
        existing_problem = await mongodb["problems"].find_one({"_id": ObjectId(problem_id)})
        if not existing_problem:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Problem not found"
            )
        
        # Update only provided fields
        update_dict = problem_update.dict(exclude_unset=True)
        update_dict["updatedAt"] = datetime.utcnow()
        
        await mongodb["problems"].update_one(
            {"_id": ObjectId(problem_id)},
            {"$set": update_dict}
        )
        
        updated_problem = await mongodb["problems"].find_one({"_id": ObjectId(problem_id)})
        return problem_helper(updated_problem)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating problem: {str(e)}"
        )

@router.patch("/{problem_id}/publish")
async def toggle_publish(problem_id: str):
    """Toggle publish status of a problem"""
    try:
        from ..core.database import get_mongo_db
        
        mongodb = get_mongo_db()
        
        if not ObjectId.is_valid(problem_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid problem ID"
            )
        
        problem = await mongodb["problems"].find_one({"_id": ObjectId(problem_id)})
        if not problem:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Problem not found"
            )
        
        new_status = not problem.get("published", False)
        
        await mongodb["problems"].update_one(
            {"_id": ObjectId(problem_id)},
            {"$set": {"published": new_status, "updatedAt": datetime.utcnow()}}
        )
        
        updated_problem = await mongodb["problems"].find_one({"_id": ObjectId(problem_id)})
        return problem_helper(updated_problem)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error toggling publish status: {str(e)}"
        )

@router.delete("/{problem_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_problem(problem_id: str):
    """Delete a problem (admin only)"""
    try:
        from ..core.database import get_mongo_db
        
        mongodb = get_mongo_db()
        
        if not ObjectId.is_valid(problem_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid problem ID"
            )
        
        result = await mongodb["problems"].delete_one({"_id": ObjectId(problem_id)})
        if result.deleted_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Problem not found"
            )
        
        return None
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting problem: {str(e)}"
        )
