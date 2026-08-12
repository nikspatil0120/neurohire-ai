from fastapi import APIRouter, HTTPException, status
from typing import List, Optional
from datetime import datetime
from bson import ObjectId

router = APIRouter(prefix="/aptitude-questions", tags=["aptitude"])

def question_helper(question) -> dict:
    """Convert MongoDB document to dictionary"""
    return {
        "id": str(question["_id"]),
        "serialNumber": question.get("serialNumber"),
        "question": question["question"],
        "options": question["options"],
        "explanation": question["explanation"],
        "category": question["category"],
        "difficulty": question["difficulty"],
        "tags": question.get("tags", []),
        "createdAt": question.get("createdAt"),
        "updatedAt": question.get("updatedAt")
    }

@router.get("/")
async def get_all_questions(
    category: Optional[str] = None,
    difficulty: Optional[str] = None
):
    """Get all aptitude questions with optional filters"""
    try:
        from ..core.database import mongo_db
        
        if mongo_db is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database not available"
            )
        
        questions_coll = mongo_db["aptitude_questions"]
        
        # Build query
        query = {}
        if category:
            query["category"] = category
        if difficulty:
            query["difficulty"] = difficulty
        
        # Fetch questions
        questions = []
        async for question in questions_coll.find(query).sort("serialNumber", 1):
            questions.append(question_helper(question))
        
        return questions
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching questions: {str(e)}"
        )

@router.get("/{question_id}")
async def get_question(question_id: str):
    """Get a single question by ID"""
    try:
        from ..core.database import mongo_db
        
        if not ObjectId.is_valid(question_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid question ID"
            )
        
        questions_coll = mongo_db["aptitude_questions"]
        question = await questions_coll.find_one({"_id": ObjectId(question_id)})
        
        if not question:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Question not found"
            )
        
        return question_helper(question)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching question: {str(e)}"
        )

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_question(question_data: dict):
    """Create a new aptitude question (admin only)"""
    try:
        from ..core.database import mongo_db
        
        questions_coll = mongo_db["aptitude_questions"]
        
        # Add timestamps
        question_data["createdAt"] = datetime.utcnow()
        question_data["updatedAt"] = datetime.utcnow()
        
        # Get next serial number
        last_question = await questions_coll.find_one(
            sort=[("serialNumber", -1)]
        )
        question_data["serialNumber"] = (last_question.get("serialNumber", 0) + 1) if last_question else 1
        
        result = await questions_coll.insert_one(question_data)
        created_question = await questions_coll.find_one({"_id": result.inserted_id})
        
        return question_helper(created_question)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating question: {str(e)}"
        )

@router.put("/{question_id}")
async def update_question(question_id: str, question_data: dict):
    """Update an aptitude question (admin only)"""
    try:
        from ..core.database import mongo_db
        
        if not ObjectId.is_valid(question_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid question ID"
            )
        
        questions_coll = mongo_db["aptitude_questions"]
        
        # Check if question exists
        existing = await questions_coll.find_one({"_id": ObjectId(question_id)})
        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Question not found"
            )
        
        # Update timestamp
        question_data["updatedAt"] = datetime.utcnow()
        
        # Remove _id if present
        question_data.pop("_id", None)
        question_data.pop("id", None)
        
        await questions_coll.update_one(
            {"_id": ObjectId(question_id)},
            {"$set": question_data}
        )
        
        updated_question = await questions_coll.find_one({"_id": ObjectId(question_id)})
        return question_helper(updated_question)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating question: {str(e)}"
        )

@router.delete("/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_question(question_id: str):
    """Delete an aptitude question (admin only)"""
    try:
        from ..core.database import mongo_db
        
        if not ObjectId.is_valid(question_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid question ID"
            )
        
        questions_coll = mongo_db["aptitude_questions"]
        result = await questions_coll.delete_one({"_id": ObjectId(question_id)})
        
        if result.deleted_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Question not found"
            )
        
        return None
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting question: {str(e)}"
        )
