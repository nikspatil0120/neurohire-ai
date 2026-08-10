from fastapi import APIRouter, HTTPException, status
from typing import List, Optional
from datetime import datetime
from bson import ObjectId
from ..models.problem import Problem, ProblemCreate, ProblemUpdate
from ..core import database

router = APIRouter(prefix="/problems", tags=["problems"])

def problem_helper(problem) -> dict:
    """Convert MongoDB document to dictionary"""
    return {
        "id": str(problem["_id"]),
        "title": problem["title"],
        "difficulty": problem["difficulty"],
        "tags": problem.get("tags", []),
        "companies": problem.get("companies", []),
        "description": problem["description"],
        "examples": problem.get("examples", []),
        "constraints": problem.get("constraints", []),
        "testCases": problem.get("testCases", []),
        "codeTemplates": problem.get("codeTemplates", {}),
        "stats": problem.get("stats", {}),
        "published": problem.get("published", False),
        "createdAt": problem.get("createdAt"),
        "updatedAt": problem.get("updatedAt")
    }

@router.get("/")
async def get_all_problems(published_only: Optional[bool] = None):
    """Get all problems (admin) or only published problems (candidates)"""
    try:
        query = {}
        if published_only:
            query["published"] = True
        
        problems = []
        async for problem in database.problems_collection.find(query):
            problems.append(problem_helper(problem))
        
        return problems
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching problems: {str(e)}"
        )

@router.get("/{problem_id}")
async def get_problem(problem_id: str):
    """Get a single problem by ID"""
    try:
        if not ObjectId.is_valid(problem_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid problem ID"
            )
        
        problem = await database.problems_collection.find_one({"_id": ObjectId(problem_id)})
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
        problem_dict = problem.dict()
        problem_dict["createdAt"] = datetime.utcnow()
        problem_dict["updatedAt"] = datetime.utcnow()
        
        result = await database.problems_collection.insert_one(problem_dict)
        created_problem = await database.problems_collection.find_one({"_id": result.inserted_id})
        
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
        if not ObjectId.is_valid(problem_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid problem ID"
            )
        
        # Get existing problem
        existing_problem = await database.problems_collection.find_one({"_id": ObjectId(problem_id)})
        if not existing_problem:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Problem not found"
            )
        
        # Update only provided fields
        update_dict = problem_update.dict(exclude_unset=True)
        update_dict["updatedAt"] = datetime.utcnow()
        
        await database.problems_collection.update_one(
            {"_id": ObjectId(problem_id)},
            {"$set": update_dict}
        )
        
        updated_problem = await database.problems_collection.find_one({"_id": ObjectId(problem_id)})
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
        if not ObjectId.is_valid(problem_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid problem ID"
            )
        
        problem = await database.problems_collection.find_one({"_id": ObjectId(problem_id)})
        if not problem:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Problem not found"
            )
        
        new_status = not problem.get("published", False)
        
        await database.problems_collection.update_one(
            {"_id": ObjectId(problem_id)},
            {"$set": {"published": new_status, "updatedAt": datetime.utcnow()}}
        )
        
        updated_problem = await database.problems_collection.find_one({"_id": ObjectId(problem_id)})
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
        if not ObjectId.is_valid(problem_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid problem ID"
            )
        
        result = await database.problems_collection.delete_one({"_id": ObjectId(problem_id)})
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
