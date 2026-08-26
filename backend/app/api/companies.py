from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import logging

from app.core.database import get_mongo_db

router = APIRouter(prefix="/companies", tags=["companies"])

# Schema for company data
class CompanyData(BaseModel):
    company_name: str
    registration_number: str

@router.post("/seed")
async def seed_companies():
    """Seed companies collection with initial company data (no auth required)"""
    try:
        mongodb = get_mongo_db()
        logger = logging.getLogger(__name__)
        
        if mongodb is None:
            logger.error("MongoDB database connection is None")
            raise HTTPException(
                status_code=503,
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
        logger = logging.getLogger(__name__)
        logger.error(f"Error seeding companies: {type(e).__name__}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error seeding companies: {str(e)}"
        )

@router.get("/")
async def get_companies():
    """Get all companies from the database (no auth required)"""
    try:
        mongodb = get_mongo_db()
        logger = logging.getLogger(__name__)
        
        if mongodb is None:
            logger.error("MongoDB database connection is None")
            raise HTTPException(
                status_code=503,
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
        logger = logging.getLogger(__name__)
        logger.error(f"Error getting companies: {type(e).__name__}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error getting companies: {str(e)}"
        )

@router.get("/search")
async def search_companies(query: str = ""):
    """Search companies by name (no auth required)"""
    try:
        mongodb = get_mongo_db()
        logger = logging.getLogger(__name__)
        
        if mongodb is None:
            logger.error("MongoDB database connection is None")
            raise HTTPException(
                status_code=503,
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
        logger = logging.getLogger(__name__)
        logger.error(f"Error searching companies: {type(e).__name__}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error searching companies: {str(e)}"
        )
