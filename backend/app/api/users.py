from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from bson import ObjectId
from pydantic import BaseModel
import json

from app.core.database import get_db, get_mongo_db
from app.models.user import User
from app.schemas.user import UserResponse, UserUpdate
from app.api.auth import get_current_user

router = APIRouter(prefix="/users", tags=["users"])

# Schema for profile photo
class ProfilePhotoRequest(BaseModel):
    photo: str
    email: str  # Add email field for development

# Schema for full profile data
class ProfileDataRequest(BaseModel):
    fullName: str
    email: str
    phone: str
    country: str
    dateOfBirth: str
    gender: str
    address: str
    education: list
    experience: list
    projects: list
    skills: list
    achievements: list
    additionalSections: list

# Schema for recruiter profile data
class RecruiterProfileDataRequest(BaseModel):
    # Organization Details
    organizationName: str
    organizationLogo: str = ""
    organizationRegistrationNo: str
    organizationLocation: str
    organizationEmail: str
    organizationOrigin: str
    organizationDescription: str
    organizationTelephone: str
    
    # Recruiter Details
    recruiterName: str
    recruiterDesignation: str
    recruiterPhone: str
    recruiterCompanyMail: str

# Schema for company data
class CompanyData(BaseModel):
    company_name: str
    registration_number: str

# Helper function to convert ObjectId to string
def user_helper(user) -> dict:
    """Convert MongoDB user document to dict with string IDs"""
    return {
        "_id": str(user["_id"]),
        "full_name": user.get("full_name", ""),
        "email": user.get("email", ""),
        "role": user.get("role", ""),
        "is_active": user.get("is_active", True),
        "created_at": user.get("created_at", ""),
        "last_login": user.get("last_login", None),
    }

@router.get("/", response_model=List[UserResponse])
async def get_users(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all users (admin only)"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    result = await db.execute(select(User).offset(skip).limit(limit))
    users = result.scalars().all()
    return users

# MongoDB endpoints for fetching users by role - MUST BE BEFORE /{user_id} route
@router.get("/recruiters")
async def get_recruiters():
    """Get all recruiters from MongoDB"""
    try:
        from app.core.database import get_mongo_db
        
        mongodb = get_mongo_db()
        
        if mongodb is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database not available"
            )
        
        users_collection = mongodb["users"]
        
        # Find all users with role='recruiter'
        recruiters_cursor = users_collection.find({"role": "recruiter"})
        recruiters = [user_helper(recruiter) async for recruiter in recruiters_cursor]
        
        return recruiters
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching recruiters: {str(e)}"
        )

@router.get("/candidates")
async def get_candidates():
    """Get all candidates from MongoDB"""
    try:
        from app.core.database import get_mongo_db
        import logging
        logger = logging.getLogger(__name__)
        
        mongodb = get_mongo_db()
        logger.info(f"MongoDB connection status: {mongodb is not None}")
        
        if mongodb is None:
            logger.error("MongoDB database connection is None")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database not available - MongoDB not connected"
            )
        
        users_collection = mongodb["users"]
        logger.info(f"Users collection: {users_collection}")
        
        # Find all users with role='candidate'
        candidates_cursor = users_collection.find({"role": "candidate"})
        candidates = [user_helper(candidate) async for candidate in candidates_cursor]
        
        logger.info(f"Found {len(candidates)} candidates")
        return candidates
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error fetching candidates: {type(e).__name__}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching candidates: {type(e).__name__}: {str(e)}"
        )

@router.get("/profile/stats")
async def get_user_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get user statistics"""
    # This would calculate user-specific stats
    # For now, return placeholder data
    return {
        "total_interviews": 0,
        "completed_interviews": 0,
        "average_score": 0,
        "last_interview_date": None
    }

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user by ID"""
    # Users can only access their own data unless they're admin
    if current_user.id != user_id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return user

@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_update: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update user"""
    # Users can only update their own data unless they're admin
    if current_user.id != user_id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Update user fields
    update_data = user_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)
    
    await db.commit()
    await db.refresh(user)
    
    return user

@router.delete("/{user_id}")
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete user (admin only)"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    await db.delete(user)
    await db.commit()
    
    return {"message": "User deleted successfully"}

@router.post("/profile/photo")
async def save_profile_photo(photo_data: ProfilePhotoRequest):
    """Save user profile photo to MongoDB"""
    try:
        from app.core.database import get_mongo_db
        import logging
        logger = logging.getLogger(__name__)
        
        mongodb = get_mongo_db()
        
        if mongodb is None:
            logger.error("MongoDB database connection is None")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database not available"
            )
        
        users_collection = mongodb["users"]
        
        # Use email from request
        user_email = photo_data.email
        
        if not user_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email is required"
            )
        
        # Update user document with profile photo
        result = await users_collection.update_one(
            {"email": user_email},
            {"$set": {"profile_photo": photo_data.photo}},
            upsert=True
        )
        
        logger.info(f"Profile photo saved for user: {user_email}")
        return {"success": True, "message": "Profile photo saved successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error saving profile photo: {type(e).__name__}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error saving profile photo: {str(e)}"
        )

@router.get("/profile/photo")
async def get_profile_photo(email: str = None):
    """Get user profile photo from MongoDB"""
    try:
        from app.core.database import get_mongo_db
        import logging
        logger = logging.getLogger(__name__)
        
        mongodb = get_mongo_db()
        
        if mongodb is None:
            logger.error("MongoDB database connection is None")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database not available"
            )
        
        users_collection = mongodb["users"]
        
        # Use email from query parameter
        user_email = email
        
        if not user_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email is required"
            )
        
        # Get user document
        user_doc = await users_collection.find_one({"email": user_email})
        
        if not user_doc:
            logger.warning(f"No user found with email: {user_email}")
            return {"success": False, "photo": None, "message": "No profile photo found"}
        
        profile_photo = user_doc.get("profile_photo")
        
        if not profile_photo:
            return {"success": False, "photo": None, "message": "No profile photo found"}
        
        return {"success": True, "photo": profile_photo}
        
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error getting profile photo: {type(e).__name__}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting profile photo: {str(e)}"
        )

@router.post("/profile/data")
async def save_profile_data(profile_data: ProfileDataRequest):
    """Save full user profile data to MongoDB"""
    try:
        from app.core.database import get_mongo_db
        import logging
        logger = logging.getLogger(__name__)
        
        mongodb = get_mongo_db()
        
        if mongodb is None:
            logger.error("MongoDB database connection is None")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database not available"
            )
        
        users_collection = mongodb["users"]
        
        # Use email from request
        user_email = profile_data.email
        
        if not user_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email is required"
            )
        
        # Ensure projects have techStack as array
        projects_to_save = profile_data.projects
        if isinstance(projects_to_save, list):
            projects_to_save = [
                {
                    **proj,
                    "techStack": proj.get("techStack", []) if isinstance(proj.get("techStack"), list) else []
                }
                for proj in projects_to_save
            ]
        
        # Update user document with full profile data
        result = await users_collection.update_one(
            {"email": user_email},
            {"$set": {
                "full_name": profile_data.fullName,
                "email": profile_data.email,
                "phone": profile_data.phone,
                "country": profile_data.country,
                "date_of_birth": profile_data.dateOfBirth,
                "gender": profile_data.gender,
                "address": profile_data.address,
                "education": profile_data.education,
                "experience": profile_data.experience,
                "projects": projects_to_save,
                "skills": profile_data.skills,
                "achievements": profile_data.achievements,
                "additional_sections": profile_data.additionalSections
            },
            "$unset": {
                "profile.resume": "",
                "resume": ""
            }},
            upsert=True
        )
        
        logger.info(f"Profile data saved for user: {user_email}")
        return {"success": True, "message": "Profile data saved successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error saving profile data: {type(e).__name__}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error saving profile data: {str(e)}"
        )

@router.get("/profile/data")
async def get_profile_data(email: str = None):
    """Get full user profile data from MongoDB"""
    try:
        from app.core.database import get_mongo_db
        import logging
        logger = logging.getLogger(__name__)
        
        mongodb = get_mongo_db()
        
        if mongodb is None:
            logger.error("MongoDB database connection is None")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database not available"
            )
        
        users_collection = mongodb["users"]
        
        # Use email from query parameter
        user_email = email
        
        if not user_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email is required"
            )
        
        # Get user document
        user_doc = await users_collection.find_one({"email": user_email})
        
        if not user_doc:
            logger.warning(f"No user found with email: {user_email}")
            return {
                "success": False,
                "data": None,
                "message": "No profile data found"
            }
        
        # Read from new flat structure (top-level fields)
        # Fall back to old nested profile structure if needed
        profile = user_doc.get("profile", {})
        
        # Get skills from top level or old profile
        skills_data = user_doc.get("skills")
        if not skills_data:
            old_skills = profile.get("skills", "")
            if isinstance(old_skills, str) and old_skills:
                skills_data = [s for s in old_skills.split(", ") if s]
            elif isinstance(old_skills, list):
                skills_data = old_skills
            else:
                skills_data = []
        
        # Get education from top level or old profile
        education_data = user_doc.get("education")
        if not education_data:
            old_education = profile.get("education", "")
            if isinstance(old_education, str) and old_education:
                try:
                    education_data = json.loads(old_education)
                except:
                    education_data = [{"institutionName": old_education}]
            elif isinstance(old_education, list):
                education_data = old_education
            else:
                education_data = []
        
        # Get experience from top level or old profile
        experience_data = user_doc.get("experience")
        if not experience_data:
            old_experience = profile.get("experience", "")
            if isinstance(old_experience, str) and old_experience:
                try:
                    experience_data = json.loads(old_experience)
                except:
                    experience_data = []
            elif isinstance(old_experience, list):
                experience_data = old_experience
            else:
                experience_data = []
        
        # Format dateOfBirth from ISODate to string
        date_of_birth = user_doc.get("date_of_birth")
        if date_of_birth:
            if hasattr(date_of_birth, 'isoformat'):
                date_of_birth = date_of_birth.isoformat().split('T')[0]
            else:
                date_of_birth = str(date_of_birth).split('T')[0]
        
        return {
            "success": True,
            "data": {
                "fullName": user_doc.get("full_name") or user_doc.get("name", ""),
                "email": user_doc.get("email", ""),
                "phone": user_doc.get("phone") or profile.get("phone", ""),
                "country": user_doc.get("country") or profile.get("country", ""),
                "dateOfBirth": date_of_birth or "",
                "gender": user_doc.get("gender") or profile.get("gender", ""),
                "address": user_doc.get("address") or profile.get("location", ""),
                "education": education_data,
                "experience": experience_data,
                "projects": user_doc.get("projects") or profile.get("projects", []),
                "skills": skills_data,
                "achievements": user_doc.get("achievements") or profile.get("achievements", []),
                "additionalSections": user_doc.get("additional_sections") or profile.get("additionalSections", [])
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error getting profile data: {type(e).__name__}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting recruiter profile data: {str(e)}"
        )

# Recruiter Profile Endpoints
@router.post("/recruiter-profile/data")
async def save_recruiter_profile_data(profile_data: RecruiterProfileDataRequest, email: str = None):
    """Save recruiter profile data to MongoDB"""
    try:
        from app.core.database import get_mongo_db
        import logging
        logger = logging.getLogger(__name__)
        
        mongodb = get_mongo_db()
        
        if mongodb is None:
            logger.error("MongoDB database connection is None")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database not available"
            )
        
        users_collection = mongodb["users"]
        
        # Use the recruiter's login email to find the user (passed as query param)
        user_email = email
        
        if not user_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Recruiter email is required"
            )
        
        # Update user document with recruiter profile data
        result = await users_collection.update_one(
            {"email": user_email},
            {"$set": {
                # Organization Details
                "organization_name": profile_data.organizationName,
                "organization_logo": profile_data.organizationLogo,
                "organization_registration_no": profile_data.organizationRegistrationNo,
                "organization_location": profile_data.organizationLocation,
                "organization_email": profile_data.organizationEmail,
                "organization_origin": profile_data.organizationOrigin,
                "organization_description": profile_data.organizationDescription,
                "organization_telephone": profile_data.organizationTelephone,
                
                # Recruiter Details
                "recruiter_name": profile_data.recruiterName,
                "recruiter_designation": profile_data.recruiterDesignation,
                "recruiter_phone": profile_data.recruiterPhone,
                "recruiter_company_mail": profile_data.recruiterCompanyMail
            }},
            upsert=True
        )
        
        logger.info(f"Recruiter profile data saved for: {user_email}")
        return {"success": True, "message": "Recruiter profile data saved successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error saving recruiter profile data: {type(e).__name__}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error saving recruiter profile data: {str(e)}"
        )

@router.get("/recruiter-info/{email}")
async def get_recruiter_info(email: str):
    """Get recruiter's company info (logo and organization name) by email"""
    try:
        from app.core.database import get_mongo_db
        import logging
        logger = logging.getLogger(__name__)
        
        mongodb = get_mongo_db()
        
        if mongodb is None:
            raise HTTPException(
                status_code=503,
                detail="Database not available"
            )
        
        users_collection = mongodb["users"]
        user = await users_collection.find_one({"email": email})
        
        if not user:
            return {"logo": "", "organization_name": ""}
        
        return {
            "logo": user.get("organization_logo", ""),
            "organization_name": user.get("organization_name", "")
        }
        
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error fetching recruiter info: {e}")
        return {"logo": "", "organization_name": ""}

@router.get("/recruiter-logo/{email}")
async def get_recruiter_logo(email: str):
    """Get recruiter's company logo by email"""
    try:
        from app.core.database import get_mongo_db
        import logging
        logger = logging.getLogger(__name__)
        
        mongodb = get_mongo_db()
        
        if mongodb is None:
            raise HTTPException(
                status_code=503,
                detail="Database not available"
            )
        
        users_collection = mongodb["users"]
        user = await users_collection.find_one({"email": email})
        
        if not user:
            return {"logo": ""}
        
        return {"logo": user.get("organization_logo", "")}
        
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error fetching recruiter logo: {e}")
        return {"logo": ""}

@router.get("/debug/recruiter/{email}")
async def debug_recruiter_data(email: str):
    """Debug endpoint to check recruiter data including logo"""
    try:
        from app.core.database import get_mongo_db
        import logging
        logger = logging.getLogger(__name__)
        
        mongodb = get_mongo_db()
        
        if mongodb is None:
            raise HTTPException(
                status_code=503,
                detail="Database not available"
            )
        
        users_collection = mongodb["users"]
        user = await users_collection.find_one({"email": email})
        
        if not user:
            return {"error": "User not found"}
        
        # Return relevant fields
        return {
            "email": user.get("email"),
            "role": user.get("role"),
            "organization_name": user.get("organization_name"),
            "organization_logo": user.get("organization_logo"),
            "has_logo": bool(user.get("organization_logo")),
            "logo_length": len(user.get("organization_logo", "")) if user.get("organization_logo") else 0
        }
        
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error in debug endpoint: {e}")
        return {"error": str(e)}

@router.get("/recruiter-profile/data")
async def get_recruiter_profile_data(email: str = None):
    """Get recruiter profile data from MongoDB"""
    try:
        from app.core.database import get_mongo_db
        import logging
        logger = logging.getLogger(__name__)
        
        mongodb = get_mongo_db()
        
        if mongodb is None:
            logger.error("MongoDB database connection is None")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database not available"
            )
        
        users_collection = mongodb["users"]
        
        # Use email from query parameter
        user_email = email
        
        if not user_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email is required"
            )
        
        # Get user document
        user_doc = await users_collection.find_one({"email": user_email})
        
        if not user_doc:
            logger.warning(f"No user found with email: {user_email}")
            return {
                "success": False,
                "data": None,
                "message": "No recruiter profile data found"
            }
        
        return {
            "success": True,
            "data": {
                # Organization Details
                "organizationName": user_doc.get("organization_name", ""),
                "organizationLogo": user_doc.get("organization_logo", ""),
                "organizationRegistrationNo": user_doc.get("organization_registration_no", ""),
                "organizationLocation": user_doc.get("organization_location", ""),
                "organizationEmail": user_doc.get("organization_email", ""),
                "organizationOrigin": user_doc.get("organization_origin", ""),
                "organizationDescription": user_doc.get("organization_description", ""),
                "organizationTelephone": user_doc.get("organization_telephone", ""),
                
                # Recruiter Details
                "recruiterName": user_doc.get("recruiter_name", ""),
                "recruiterDesignation": user_doc.get("recruiter_designation", ""),
                "recruiterPhone": user_doc.get("recruiter_phone", ""),
                "recruiterCompanyMail": user_doc.get("recruiter_company_mail", "")
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error getting recruiter profile data: {type(e).__name__}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting recruiter profile data: {str(e)}"
        )

# Company Data Endpoints
@router.post("/companies/seed")
async def seed_companies():
    """Seed companies collection with initial company data (no auth required for development)"""
    try:
        from app.core.database import get_mongo_db
        import logging
        logger = logging.getLogger(__name__)
        
        mongodb = get_mongo_db()
        
        if mongodb is None:
            logger.error("MongoDB database connection is None")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database not available"
            )
        
        companies_collection = mongodb["companies"]
        
        # Check if companies already exist
        existing_count = await companies_collection.count_documents({})
        if existing_count > 0:
            logger.info(f"Companies collection already has {existing_count} documents")
            return {
                "success": True,
                "message": f"Companies collection already has {existing_count} documents",
                "count": existing_count
            }
        
        # Company data to seed
        companies_data = [
            {"company_name": "Tata Consultancy Services", "registration_number": "4827156390"},
            {"company_name": "Infosys Limited", "registration_number": "7316042859"},
            {"company_name": "Wipro Limited", "registration_number": "2958174630"},
            {"company_name": "HCL Technologies", "registration_number": "8642093157"},
            {"company_name": "Tech Mahindra", "registration_number": "5173826409"},
            {"company_name": "Reliance Industries", "registration_number": "6381049275"},
            {"company_name": "Larsen & Toubro", "registration_number": "9047261835"},
            {"company_name": "ICICI Bank", "registration_number": "3518907246"},
            {"company_name": "HDFC Bank", "registration_number": "7264158039"},
            {"company_name": "Axis Bank", "registration_number": "1846392750"},
            {"company_name": "Accenture India", "registration_number": "5938172046"},
            {"company_name": "Deloitte India", "registration_number": "8402617359"},
            {"company_name": "Capgemini India", "registration_number": "3159074826"},
            {"company_name": "IBM India", "registration_number": "6795241038"},
            {"company_name": "Microsoft India", "registration_number": "4287601953"},
            {"company_name": "Amazon India", "registration_number": "8153496207"},
            {"company_name": "Flipkart", "registration_number": "2607184953"},
            {"company_name": "Zoho Corporation", "registration_number": "9471358026"},
            {"company_name": "Freshworks", "registration_number": "5832061749"},
            {"company_name": "Mphasis", "registration_number": "7049183265"}
        ]
        
        # Insert companies into MongoDB
        result = await companies_collection.insert_many(companies_data)
        
        logger.info(f"Seeded {len(result.inserted_ids)} companies into database")
        return {
            "success": True,
            "message": f"Successfully seeded {len(result.inserted_ids)} companies",
            "count": len(result.inserted_ids)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error seeding companies: {type(e).__name__}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error seeding companies: {str(e)}"
        )

@router.get("/companies")
async def get_companies():
    """Get all companies from the database (no auth required for development)"""
    try:
        from app.core.database import get_mongo_db
        import logging
        logger = logging.getLogger(__name__)
        
        mongodb = get_mongo_db()
        
        if mongodb is None:
            logger.error("MongoDB database connection is None")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database not available"
            )
        
        companies_collection = mongodb["companies"]
        
        # Get all companies
        companies = await companies_collection.find({}).to_list(length=None)
        
        # Convert ObjectId to string
        companies_list = []
        for company in companies:
            companies_list.append({
                "_id": str(company["_id"]),
                "company_name": company.get("company_name", ""),
                "registration_number": company.get("registration_number", "")
            })
        
        return {
            "success": True,
            "data": companies_list,
            "count": len(companies_list)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error getting companies: {type(e).__name__}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting companies: {str(e)}"
        )

@router.get("/companies/search")
async def search_companies(query: str = ""):
    """Search companies by name (no auth required for development)"""
    try:
        from app.core.database import get_mongo_db
        import logging
        logger = logging.getLogger(__name__)
        
        mongodb = get_mongo_db()
        
        if mongodb is None:
            logger.error("MongoDB database connection is None")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database not available"
            )
        
        companies_collection = mongodb["companies"]
        
        # Search companies by name (case-insensitive)
        search_query = {}
        if query:
            search_query = {"company_name": {"$regex": query, "$options": "i"}}
        
        companies = await companies_collection.find(search_query).to_list(length=None)
        
        # Convert ObjectId to string
        companies_list = []
        for company in companies:
            companies_list.append({
                "_id": str(company["_id"]),
                "company_name": company.get("company_name", ""),
                "registration_number": company.get("registration_number", "")
            })
        
        return {
            "success": True,
            "data": companies_list,
            "count": len(companies_list)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error searching companies: {type(e).__name__}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error searching companies: {str(e)}"
        )

@router.post("/profile/cleanup")
async def cleanup_old_schema(email: str = None):
    """Clean up old schema fields from MongoDB (remove resume, migrate all profile fields to top level)"""
    try:
        from app.core.database import get_mongo_db
        import logging
        logger = logging.getLogger(__name__)
        
        mongodb = get_mongo_db()
        
        if mongodb is None:
            logger.error("MongoDB database connection is None")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database not available"
            )
        
        users_collection = mongodb["users"]
        
        # If email provided, clean up specific user, otherwise clean up all users
        query = {"email": email} if email else {}
        
        # Get all users to migrate
        users_to_migrate = await users_collection.find(query).to_list(length=None)
        migrated_count = 0
        
        for user in users_to_migrate:
            profile = user.get("profile", {})
            
            # Build the update object with all fields from profile moved to top level
            update_set = {}
            unset_fields = {}
            
            # Map old profile fields to new top-level fields
            if profile.get("phone") and not user.get("phone"):
                update_set["phone"] = profile["phone"]
                unset_fields["profile.phone"] = ""
            
            if profile.get("country") and not user.get("country"):
                update_set["country"] = profile["country"]
                unset_fields["profile.country"] = ""
            
            if profile.get("dateOfBirth") and not user.get("date_of_birth"):
                update_set["date_of_birth"] = profile["dateOfBirth"]
                unset_fields["profile.dateOfBirth"] = ""
            
            if profile.get("gender") and not user.get("gender"):
                update_set["gender"] = profile["gender"]
                unset_fields["profile.gender"] = ""
            
            if profile.get("location") and not user.get("address"):
                update_set["address"] = profile["location"]
                unset_fields["profile.location"] = ""
            
            # Migrate skills
            if profile.get("skills"):
                if isinstance(profile["skills"], str):
                    skills_array = [s for s in profile["skills"].split(", ") if s]
                else:
                    skills_array = profile["skills"]
                if not user.get("skills"):
                    update_set["skills"] = skills_array
                unset_fields["profile.skills"] = ""
            
            # Migrate education
            if profile.get("education"):
                if isinstance(profile["education"], str):
                    try:
                        education_array = json.loads(profile["education"])
                    except:
                        education_array = [{"institutionName": profile["education"]}]
                else:
                    education_array = profile["education"]
                if not user.get("education"):
                    update_set["education"] = education_array
                unset_fields["profile.education"] = ""
            
            # Migrate experience
            if profile.get("experience"):
                if isinstance(profile["experience"], str):
                    try:
                        experience_array = json.loads(profile["experience"])
                    except:
                        experience_array = []
                else:
                    experience_array = profile["experience"]
                if not user.get("experience"):
                    update_set["experience"] = experience_array
                unset_fields["profile.experience"] = ""
            
            # Migrate projects
            if profile.get("projects"):
                old_projects = profile["projects"]
                migrated_projects = []
                if isinstance(old_projects, list):
                    for proj in old_projects:
                        # Ensure techStack is an array
                        if isinstance(proj, dict):
                            if "techStack" in proj and isinstance(proj["techStack"], str):
                                proj["techStack"] = [t for t in proj["techStack"].split(", ") if t]
                            elif "techStack" not in proj:
                                proj["techStack"] = []
                            migrated_projects.append(proj)
                        else:
                            migrated_projects.append(proj)
                if not user.get("projects"):
                    update_set["projects"] = migrated_projects
                unset_fields["profile.projects"] = ""
            
            # Migrate achievements
            if profile.get("achievements") and not user.get("achievements"):
                update_set["achievements"] = profile["achievements"]
                unset_fields["profile.achievements"] = ""
            
            # Migrate additionalSections
            if profile.get("additionalSections") and not user.get("additional_sections"):
                update_set["additional_sections"] = profile["additionalSections"]
                unset_fields["profile.additionalSections"] = ""
            
            # Always remove resume fields
            unset_fields["profile.resume"] = ""
            unset_fields["resume"] = ""
            
            # Apply updates if there are any
            if update_set or unset_fields:
                update_operation = {}
                if update_set:
                    update_operation["$set"] = update_set
                if unset_fields:
                    update_operation["$unset"] = unset_fields
                
                await users_collection.update_one(
                    {"_id": user["_id"]},
                    update_operation
                )
                migrated_count += 1
                logger.info(f"Migrated profile for user: {user.get('email')}")
        
        # Final cleanup - remove entire profile object if empty
        await users_collection.update_many(
            query,
            {"$unset": {"profile": ""}}
        )
        
        logger.info(f"Migrated {migrated_count} user documents to new schema")
        return {
            "success": True,
            "message": f"Migrated {migrated_count} user documents to new flat schema",
            "migratedCount": migrated_count
        }
        
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error cleaning up schema: {type(e).__name__}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error cleaning up schema: {str(e)}"
        )