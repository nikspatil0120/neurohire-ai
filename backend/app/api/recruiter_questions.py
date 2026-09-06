"""
Recruiter Question Bank API
Stores recruiter-owned aptitude and coding questions in MongoDB.
Collection: recruiter_questions
"""

from fastapi import APIRouter, HTTPException, status
from typing import List, Optional, Any
from pydantic import BaseModel
from bson import ObjectId
from datetime import datetime
import logging

from app.core.database import get_mongo_db

router = APIRouter(prefix="/recruiter-questions", tags=["recruiter-questions"])
logger = logging.getLogger(__name__)

COLLECTION = "recruiter_questions"


# ── Pydantic models ────────────────────────────────────────────────────────────

class TestCase(BaseModel):
    input: str = ""
    expected_output: str = ""
    description: Optional[str] = ""

class AptitudeOption(BaseModel):
    text: str

class QuestionCreate(BaseModel):
    recruiter_email: str
    question_type: str          # "aptitude" | "coding"
    # Aptitude-specific
    subtype: Optional[str] = "mcq"   # "mcq" | "numerical"
    question_text: str
    options: Optional[List[str]] = []
    correct_answer: Optional[Any] = None   # index (MCQ) or number (numerical)
    explanation: Optional[str] = ""
    difficulty: Optional[str] = "Medium"
    category: Optional[str] = ""
    # Coding-specific
    description: Optional[str] = ""
    test_cases: Optional[List[TestCase]] = []
    tags: Optional[List[str]] = []

class QuestionUpdate(BaseModel):
    question_text: Optional[str] = None
    subtype: Optional[str] = None
    options: Optional[List[str]] = None
    correct_answer: Optional[Any] = None
    explanation: Optional[str] = None
    difficulty: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    test_cases: Optional[List[TestCase]] = None
    tags: Optional[List[str]] = None


# ── Helper ─────────────────────────────────────────────────────────────────────

def q_helper(doc) -> dict:
    tc = doc.get("test_cases", [])
    # normalise test_cases dicts
    if tc and isinstance(tc[0], dict):
        pass
    return {
        "id": str(doc["_id"]),
        "recruiter_email": doc.get("recruiter_email", ""),
        "question_type": doc.get("question_type", "aptitude"),
        "subtype": doc.get("subtype", "mcq"),
        "question_text": doc.get("question_text", ""),
        "options": doc.get("options", []),
        "correct_answer": doc.get("correct_answer"),
        "explanation": doc.get("explanation", ""),
        "difficulty": doc.get("difficulty", "Medium"),
        "category": doc.get("category", ""),
        "description": doc.get("description", ""),
        "test_cases": tc,
        "tags": doc.get("tags", []),
        "created_at": doc.get("created_at", ""),
        "updated_at": doc.get("updated_at", ""),
    }


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.get("/")
async def get_questions(recruiter_email: str, question_type: Optional[str] = None):
    """Get all questions for a recruiter, optionally filtered by type."""
    try:
        mongodb = get_mongo_db()
        if mongodb is None:
            raise HTTPException(status_code=503, detail="Database not available")

        query: dict = {"recruiter_email": recruiter_email}
        if question_type:
            query["question_type"] = question_type

        cursor = mongodb[COLLECTION].find(query).sort("created_at", -1)
        docs = [q_helper(d) async for d in cursor]
        return {"success": True, "questions": docs, "count": len(docs)}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"get_questions error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/", status_code=201)
async def create_question(data: QuestionCreate):
    """Create a new question."""
    try:
        mongodb = get_mongo_db()
        if mongodb is None:
            raise HTTPException(status_code=503, detail="Database not available")

        now = datetime.utcnow().isoformat()
        doc = data.dict()
        # serialise nested TestCase objects
        doc["test_cases"] = [tc if isinstance(tc, dict) else tc.dict() for tc in (data.test_cases or [])]
        doc["created_at"] = now
        doc["updated_at"] = now

        result = await mongodb[COLLECTION].insert_one(doc)
        created = await mongodb[COLLECTION].find_one({"_id": result.inserted_id})
        return {"success": True, "question": q_helper(created)}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"create_question error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{question_id}")
async def update_question(question_id: str, data: QuestionUpdate):
    """Update a question."""
    try:
        mongodb = get_mongo_db()
        if mongodb is None:
            raise HTTPException(status_code=503, detail="Database not available")

        if not ObjectId.is_valid(question_id):
            raise HTTPException(status_code=400, detail="Invalid question ID")

        update = {k: v for k, v in data.dict(exclude_unset=True).items() if v is not None}
        if "test_cases" in update:
            update["test_cases"] = [tc if isinstance(tc, dict) else tc.dict() for tc in update["test_cases"]]
        update["updated_at"] = datetime.utcnow().isoformat()

        result = await mongodb[COLLECTION].update_one(
            {"_id": ObjectId(question_id)}, {"$set": update}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Question not found")

        updated = await mongodb[COLLECTION].find_one({"_id": ObjectId(question_id)})
        return {"success": True, "question": q_helper(updated)}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"update_question error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{question_id}", status_code=200)
async def delete_question(question_id: str):
    """Delete a question."""
    try:
        mongodb = get_mongo_db()
        if mongodb is None:
            raise HTTPException(status_code=503, detail="Database not available")

        if not ObjectId.is_valid(question_id):
            raise HTTPException(status_code=400, detail="Invalid question ID")

        result = await mongodb[COLLECTION].delete_one({"_id": ObjectId(question_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Question not found")

        return {"success": True, "message": "Question deleted"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"delete_question error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
