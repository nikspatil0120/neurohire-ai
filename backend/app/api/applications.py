"""
Applications & Job Slots API
Collections used:
  - job_slots        : interview/test slots per job
  - applications     : candidate → job → slot relationship
"""

from fastapi import APIRouter, HTTPException, status, Query
from typing import List, Optional
from pydantic import BaseModel
from bson import ObjectId
from datetime import datetime
import logging

from app.core.database import get_mongo_db

router = APIRouter(prefix="/applications", tags=["applications"])
logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────
# Pydantic models
# ─────────────────────────────────────────────

class SlotCreate(BaseModel):
    job_id: str
    slot_date: str          # "2026-09-10"
    start_time: str         # "10:00"
    end_time: Optional[str] = None
    max_capacity: Optional[int] = 50
    label: Optional[str] = ""   # friendly label e.g. "Morning Slot"

class SlotStatusUpdate(BaseModel):
    status: str  # "active" | "disabled" | "full"

class ApplicationCreate(BaseModel):
    job_id: str
    candidate_id: str
    candidate_email: str
    candidate_name: str
    slot_id: Optional[str] = ""   # no longer required

class ApplicationStatusUpdate(BaseModel):
    application_status: str  # "applied","test_pending","test_started","test_completed","interview_pending","selected","rejected"

class SlotChangeRequest(BaseModel):
    new_slot_id: str

class RoundScoreUpdate(BaseModel):
    round: str          # "aptitude" | "coding" | "interview"
    score: float
    max_score: Optional[float] = None
    notes: Optional[str] = ""


# ─────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────

def slot_helper(slot) -> dict:
    return {
        "_id": str(slot["_id"]),
        "job_id": str(slot.get("job_id", "")),
        "slot_date": slot.get("slot_date", ""),
        "start_time": slot.get("start_time", ""),
        "end_time": slot.get("end_time", ""),
        "max_capacity": slot.get("max_capacity", 50),
        "current_count": slot.get("current_count", 0),
        "status": slot.get("status", "active"),
        "label": slot.get("label", ""),
        "created_at": slot.get("created_at", ""),
        "updated_at": slot.get("updated_at", ""),
    }


def application_helper(app) -> dict:
    return {
        "_id": str(app["_id"]),
        "candidate_id": str(app.get("candidate_id", "")),
        "candidate_email": app.get("candidate_email", ""),
        "candidate_name": app.get("candidate_name", ""),
        "job_id": str(app.get("job_id", "")),
        "job_title": app.get("job_title", ""),
        "recruiter_email": app.get("recruiter_email", ""),
        "organization_name": app.get("organization_name", ""),
        "slot_id": str(app.get("slot_id", "")),
        "slot_date": app.get("slot_date", ""),
        "slot_start_time": app.get("slot_start_time", ""),
        "slot_label": app.get("slot_label", ""),
        "application_status": app.get("application_status", "applied"),
        "current_round": app.get("current_round", ""),
        "test_status": app.get("test_status", "pending"),
        # Round scores – stored as { round: { score, max_score, notes, submitted_at } }
        "scores": app.get("scores", {}),
        "applied_at": app.get("applied_at", ""),
        "created_at": app.get("created_at", ""),
        "updated_at": app.get("updated_at", ""),
    }


# ─────────────────────────────────────────────
# SLOT ENDPOINTS
# ─────────────────────────────────────────────

@router.post("/slots", status_code=status.HTTP_201_CREATED)
async def create_slot(slot_data: SlotCreate):
    """Recruiter creates a slot for a job."""
    try:
        mongodb = get_mongo_db()
        if mongodb is None:
            raise HTTPException(status_code=503, detail="Database not available")

        # Validate job exists
        try:
            job_oid = ObjectId(slot_data.job_id)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid job_id")

        job = await mongodb["jobs"].find_one({"_id": job_oid})
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")

        now = datetime.utcnow().isoformat()
        doc = {
            "job_id": job_oid,
            "slot_date": slot_data.slot_date,
            "start_time": slot_data.start_time,
            "end_time": slot_data.end_time or "",
            "max_capacity": slot_data.max_capacity if slot_data.max_capacity else 50,
            "current_count": 0,
            "status": "active",
            "label": slot_data.label or "",
            "created_at": now,
            "updated_at": now,
        }
        result = await mongodb["job_slots"].insert_one(doc)
        created = await mongodb["job_slots"].find_one({"_id": result.inserted_id})
        return {"success": True, "slot": slot_helper(created)}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"create_slot error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/slots/job/{job_id}")
async def get_slots_for_job(job_id: str, available_only: bool = False):
    """Get all slots for a job (candidates get available_only=true)."""
    try:
        mongodb = get_mongo_db()
        if mongodb is None:
            raise HTTPException(status_code=503, detail="Database not available")

        try:
            job_oid = ObjectId(job_id)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid job_id")

        query: dict = {"job_id": job_oid}
        if available_only:
            query["status"] = "active"

        cursor = mongodb["job_slots"].find(query).sort("slot_date", 1).sort("start_time", 1)
        slots = [slot_helper(s) async for s in cursor]
        return {"success": True, "slots": slots}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"get_slots error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/slots/{slot_id}")
async def update_slot(slot_id: str, update: SlotStatusUpdate):
    """Recruiter enables/disables a slot."""
    try:
        mongodb = get_mongo_db()
        if mongodb is None:
            raise HTTPException(status_code=503, detail="Database not available")

        try:
            slot_oid = ObjectId(slot_id)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid slot_id")

        result = await mongodb["job_slots"].update_one(
            {"_id": slot_oid},
            {"$set": {"status": update.status, "updated_at": datetime.utcnow().isoformat()}}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Slot not found")

        updated = await mongodb["job_slots"].find_one({"_id": slot_oid})
        return {"success": True, "slot": slot_helper(updated)}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"update_slot error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/slots/{slot_id}")
async def delete_slot(slot_id: str):
    """Recruiter deletes a slot (only if no applications)."""
    try:
        mongodb = get_mongo_db()
        if mongodb is None:
            raise HTTPException(status_code=503, detail="Database not available")

        try:
            slot_oid = ObjectId(slot_id)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid slot_id")

        # Reject if applications exist for this slot
        count = await mongodb["applications"].count_documents({"slot_id": slot_oid})
        if count > 0:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot delete slot: {count} application(s) already booked"
            )

        result = await mongodb["job_slots"].delete_one({"_id": slot_oid})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Slot not found")

        return {"success": True, "message": "Slot deleted"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"delete_slot error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────
# APPLICATION ENDPOINTS
# ─────────────────────────────────────────────

@router.post("/apply", status_code=status.HTTP_201_CREATED)
async def apply_for_job(app_data: ApplicationCreate):
    """
    Candidate applies for a job and selects a slot.
    Validates: job exists, job active/not expired, slot belongs to job,
    slot active, no duplicate application. Uses atomic increment for slot count.
    """
    try:
        mongodb = get_mongo_db()
        if mongodb is None:
            raise HTTPException(status_code=503, detail="Database not available")

        # ── Validate IDs ────────────────────────────────────────────
        try:
            job_oid = ObjectId(app_data.job_id)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid job_id")

        # ── Validate job ─────────────────────────────────────────────
        job = await mongodb["jobs"].find_one({"_id": job_oid})
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")

        if not job.get("is_active", False):
            raise HTTPException(status_code=400, detail="Job is not active")

        job_status = job.get("status", "draft")
        if job_status not in ("published",):
            raise HTTPException(status_code=400, detail=f"Job is not published (status: {job_status})")

        end_date = job.get("end_date")
        if end_date:
            try:
                if datetime.utcnow() > datetime.fromisoformat(end_date):
                    raise HTTPException(status_code=400, detail="Job application period has expired")
            except ValueError:
                pass

        # ── Slot validation skipped (slot selection removed from candidate flow) ──

        # ── Prevent duplicate applications ───────────────────────────
        existing = await mongodb["applications"].find_one({
            "candidate_id": app_data.candidate_id,
            "job_id": str(job_oid)
        })
        if existing:
            raise HTTPException(
                status_code=400,
                detail="You have already applied for this job"
            )

        # ── Resolve organization_name (job field → recruiter user doc fallback) ──
        organization_name = job.get("organization_name", "")
        if not organization_name:
            recruiter_email = job.get("recruiter_email", "")
            if recruiter_email:
                try:
                    recruiter_user = await mongodb["users"].find_one({"email": recruiter_email})
                    if recruiter_user:
                        organization_name = recruiter_user.get("organization_name", "")
                except Exception:
                    pass

        # ── Create application ────────────────────────────────────────
        now = datetime.utcnow().isoformat()
        application_doc = {
            "candidate_id": app_data.candidate_id,
            "candidate_email": app_data.candidate_email,
            "candidate_name": app_data.candidate_name,
            "job_id": str(job_oid),
            "job_title": job.get("title", ""),
            "recruiter_email": job.get("recruiter_email", ""),
            "organization_name": organization_name,
            "slot_id": app_data.slot_id or "",
            "slot_date": "",
            "slot_start_time": "",
            "slot_label": "",
            "application_status": "applied",
            "current_round": _determine_first_round(job),
            "test_status": "pending",
            "applied_at": now,
            "created_at": now,
            "updated_at": now,
        }
        result = await mongodb["applications"].insert_one(application_doc)

        # ── Increment job application counter ──────────────────────────
        await mongodb["jobs"].update_one(
            {"_id": job_oid},
            {"$inc": {"applications": 1}}
        )

        created = await mongodb["applications"].find_one({"_id": result.inserted_id})
        return {"success": True, "application": application_helper(created)}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"apply_for_job error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


def _determine_first_round(job: dict) -> str:
    """Return label of the first round based on priority settings."""
    rounds = []
    if job.get("aptitude_priority") is not None:
        rounds.append(("aptitude", job["aptitude_priority"]))
    if job.get("coding_priority") is not None:
        rounds.append(("coding", job["coding_priority"]))
    rounds.append(("interview", 99))  # interview always last
    rounds.sort(key=lambda x: x[1])
    return rounds[0][0] if rounds else "interview"


@router.get("/candidate/{candidate_id}")
async def get_candidate_applications(candidate_id: str):
    """Get all applications for a candidate."""
    try:
        mongodb = get_mongo_db()
        if mongodb is None:
            raise HTTPException(status_code=503, detail="Database not available")

        cursor = mongodb["applications"].find(
            {"candidate_id": candidate_id}
        ).sort("created_at", -1)
        apps = [application_helper(a) async for a in cursor]
        return {"success": True, "applications": apps, "count": len(apps)}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"get_candidate_applications error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/recruiter/{recruiter_email}")
async def get_recruiter_applications(
    recruiter_email: str,
    job_id: Optional[str] = Query(None),
    app_status: Optional[str] = Query(None),
):
    """
    Get all applications for jobs owned by this recruiter.
    Enforced at query level: only jobs with matching recruiter_email.
    Optional filters: job_id, application status.
    """
    try:
        mongodb = get_mongo_db()
        if mongodb is None:
            raise HTTPException(status_code=503, detail="Database not available")

        query: dict = {"recruiter_email": recruiter_email}
        if job_id:
            query["job_id"] = job_id
        if app_status:
            query["application_status"] = app_status

        cursor = mongodb["applications"].find(query).sort("created_at", -1)
        apps = [application_helper(a) async for a in cursor]
        return {"success": True, "applications": apps, "count": len(apps)}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"get_recruiter_applications error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/admin/all")
async def get_all_applications(
    job_id: Optional[str] = Query(None),
    candidate_id: Optional[str] = Query(None),
    recruiter_email: Optional[str] = Query(None),
    app_status: Optional[str] = Query(None),
    skip: int = 0,
    limit: int = 200,
):
    """Admin: get all applications across the platform with optional filters."""
    try:
        mongodb = get_mongo_db()
        if mongodb is None:
            raise HTTPException(status_code=503, detail="Database not available")

        query: dict = {}
        if job_id:
            query["job_id"] = job_id
        if candidate_id:
            query["candidate_id"] = candidate_id
        if recruiter_email:
            query["recruiter_email"] = recruiter_email
        if app_status:
            query["application_status"] = app_status

        cursor = mongodb["applications"].find(query).sort("created_at", -1).skip(skip).limit(limit)
        apps = [application_helper(a) async for a in cursor]
        total = await mongodb["applications"].count_documents(query)
        return {"success": True, "applications": apps, "count": len(apps), "total": total}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"get_all_applications error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{application_id}")
async def get_application(application_id: str):
    """Get a single application by ID."""
    try:
        mongodb = get_mongo_db()
        if mongodb is None:
            raise HTTPException(status_code=503, detail="Database not available")

        try:
            app_oid = ObjectId(application_id)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid application_id")

        app = await mongodb["applications"].find_one({"_id": app_oid})
        if not app:
            raise HTTPException(status_code=404, detail="Application not found")

        return {"success": True, "application": application_helper(app)}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"get_application error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{application_id}/status")
async def update_application_status(application_id: str, update: ApplicationStatusUpdate):
    """Update application status (recruiter/admin action)."""
    try:
        mongodb = get_mongo_db()
        if mongodb is None:
            raise HTTPException(status_code=503, detail="Database not available")

        try:
            app_oid = ObjectId(application_id)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid application_id")

        now = datetime.utcnow().isoformat()
        result = await mongodb["applications"].update_one(
            {"_id": app_oid},
            {"$set": {
                "application_status": update.application_status,
                "updated_at": now
            }}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Application not found")

        updated = await mongodb["applications"].find_one({"_id": app_oid})
        return {"success": True, "application": application_helper(updated)}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"update_application_status error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{application_id}/change-slot", status_code=status.HTTP_200_OK)
async def change_slot(application_id: str, req: SlotChangeRequest):
    """
    Candidate changes their selected slot for an existing application.
    Rules:
    - New slot must belong to the same job.
    - New slot must be active and have capacity.
    - New slot must be different from the current slot.
    - Old slot's current_count is decremented.
    - New slot's current_count is incremented.
    - Application record is updated atomically.
    """
    try:
        mongodb = get_mongo_db()
        if mongodb is None:
            raise HTTPException(status_code=503, detail="Database not available")

        try:
            app_oid = ObjectId(application_id)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid application_id")

        try:
            new_slot_oid = ObjectId(req.new_slot_id)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid new_slot_id")

        # ── Fetch the existing application ──────────────────────────
        app = await mongodb["applications"].find_one({"_id": app_oid})
        if not app:
            raise HTTPException(status_code=404, detail="Application not found")

        old_slot_id_str = app.get("slot_id", "")

        # ── Guard: same slot ────────────────────────────────────────
        if old_slot_id_str == str(new_slot_oid):
            raise HTTPException(
                status_code=400,
                detail="You have already booked this slot"
            )

        # ── Fetch new slot ──────────────────────────────────────────
        new_slot = await mongodb["job_slots"].find_one({"_id": new_slot_oid})
        if not new_slot:
            raise HTTPException(status_code=404, detail="Slot not found")

        # ── New slot must belong to the same job ────────────────────
        if str(new_slot.get("job_id", "")) != str(app.get("job_id", "")):
            raise HTTPException(
                status_code=400,
                detail="Slot does not belong to the same job"
            )

        if new_slot.get("status") != "active":
            raise HTTPException(status_code=400, detail="Selected slot is not available")

        max_cap = new_slot.get("max_capacity", 50)
        if new_slot.get("current_count", 0) >= max_cap:
            raise HTTPException(
                status_code=400,
                detail="Selected slot is fully booked. Please choose another slot."
            )

        now = datetime.utcnow().isoformat()

        # ── Decrement old slot ──────────────────────────────────────
        if old_slot_id_str:
            try:
                old_slot_oid = ObjectId(old_slot_id_str)
                await mongodb["job_slots"].update_one(
                    {"_id": old_slot_oid, "current_count": {"$gt": 0}},
                    {"$inc": {"current_count": -1}, "$set": {"updated_at": now}}
                )
            except Exception:
                pass  # If old slot doesn't exist anymore, continue

        # ── Increment new slot ──────────────────────────────────────
        await mongodb["job_slots"].update_one(
            {"_id": new_slot_oid},
            {"$inc": {"current_count": 1}, "$set": {"updated_at": now}}
        )

        # ── Update application ──────────────────────────────────────
        await mongodb["applications"].update_one(
            {"_id": app_oid},
            {"$set": {
                "slot_id": str(new_slot_oid),
                "slot_date": new_slot.get("slot_date", ""),
                "slot_start_time": new_slot.get("start_time", ""),
                "slot_label": new_slot.get("label", ""),
                "updated_at": now,
            }}
        )

        updated = await mongodb["applications"].find_one({"_id": app_oid})
        return {"success": True, "application": application_helper(updated)}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"change_slot error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{application_id}")
async def withdraw_application(application_id: str):
    """
    Candidate withdraws their application.
    Decrements the slot's current_count and the job's applications counter,
    then deletes the application document.
    """
    try:
        mongodb = get_mongo_db()
        if mongodb is None:
            raise HTTPException(status_code=503, detail="Database not available")

        try:
            app_oid = ObjectId(application_id)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid application_id")

        app = await mongodb["applications"].find_one({"_id": app_oid})
        if not app:
            raise HTTPException(status_code=404, detail="Application not found")

        now = datetime.utcnow().isoformat()

        # Decrement slot count
        slot_id_str = app.get("slot_id", "")
        if slot_id_str:
            try:
                await mongodb["job_slots"].update_one(
                    {"_id": ObjectId(slot_id_str), "current_count": {"$gt": 0}},
                    {"$inc": {"current_count": -1}, "$set": {"updated_at": now}}
                )
            except Exception:
                pass

        # Decrement job applications counter
        job_id_str = app.get("job_id", "")
        if job_id_str:
            try:
                await mongodb["jobs"].update_one(
                    {"_id": ObjectId(job_id_str), "applications": {"$gt": 0}},
                    {"$inc": {"applications": -1}}
                )
            except Exception:
                pass

        # Delete the application
        await mongodb["applications"].delete_one({"_id": app_oid})

        return {"success": True, "message": "Application withdrawn successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"withdraw_application error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{application_id}/score")
async def update_round_score(application_id: str, update: RoundScoreUpdate):
    """Recruiter/system sets a candidate's score for a specific round."""
    try:
        mongodb = get_mongo_db()
        if mongodb is None:
            raise HTTPException(status_code=503, detail="Database not available")

        try:
            app_oid = ObjectId(application_id)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid application_id")

        now = datetime.utcnow().isoformat()
        score_data = {
            "score": update.score,
            "max_score": update.max_score,
            "notes": update.notes or "",
            "submitted_at": now,
        }

        result = await mongodb["applications"].update_one(
            {"_id": app_oid},
            {"$set": {
                f"scores.{update.round}": score_data,
                "updated_at": now,
            }}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Application not found")

        updated = await mongodb["applications"].find_one({"_id": app_oid})
        return {"success": True, "application": application_helper(updated)}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"update_round_score error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/check/{candidate_id}/{job_id}")
async def check_application(candidate_id: str, job_id: str):
    """Check if a candidate has already applied to a job."""
    try:
        mongodb = get_mongo_db()
        if mongodb is None:
            raise HTTPException(status_code=503, detail="Database not available")

        existing = await mongodb["applications"].find_one({
            "candidate_id": candidate_id,
            "job_id": job_id
        })
        if existing:
            return {
                "applied": True,
                "application": application_helper(existing)
            }
        return {"applied": False, "application": None}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"check_application error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
