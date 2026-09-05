from sqlalchemy import create_engine, MetaData
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from motor.motor_asyncio import AsyncIOMotorClient
import redis.asyncio as redis
from app.config import settings
import logging

logger = logging.getLogger(__name__)

# PostgreSQL setup
try:
    if settings.POSTGRES_URL and settings.POSTGRES_URL.strip():
        engine = create_async_engine(
            settings.POSTGRES_URL.replace("postgresql://", "postgresql+asyncpg://"),
            echo=settings.DEBUG
        )
    else:
        logger.warning("POSTGRES_URL not set, skipping PostgreSQL")
        engine = None
except Exception as e:
    logger.warning(f"PostgreSQL connection failed: {e}")
    engine = None

if engine:
    AsyncSessionLocal = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
else:
    AsyncSessionLocal = None

Base = declarative_base()

# MongoDB setup
mongo_client = None
mongo_db = None
users_collection = None
interviews_collection = None
jobs_collection = None
questions_collection = None
problems_collection = None

# Redis setup
redis_client = None

async def init_db():
    """Initialize database connections"""
    global mongo_client, mongo_db, redis_client
    global users_collection, interviews_collection, jobs_collection, questions_collection, problems_collection
    
    try:
        # Initialize MongoDB
        logger.info(f"Attempting MongoDB connection to: '{settings.MONGODB_URL}'")
        logger.info(f"MONGODB_DB: '{settings.MONGODB_DB}'")
        logger.info(f"DEBUG mode: {settings.DEBUG}")
        
        if settings.MONGODB_URL and settings.MONGODB_URL.strip():
            try:
                mongo_client = AsyncIOMotorClient(settings.MONGODB_URL, serverSelectionTimeoutMS=5000)
                # Test the connection
                await mongo_client.admin.command('ping')
                # IMPORTANT: Always use settings.MONGODB_DB, not the one in URL
                mongo_db = mongo_client[settings.MONGODB_DB]
                
                # Log which database we're using
                logger.info(f"MongoDB connected to database: {settings.MONGODB_DB}")
                
                # Initialize collections with global scope
                users_collection = mongo_db["users"]
                interviews_collection = mongo_db["interviews"]
                jobs_collection = mongo_db["jobs"]
                questions_collection = mongo_db["questions"]
                problems_collection = mongo_db["problems"]
                
                # Update the global variables in this module
                import sys
                current_module = sys.modules[__name__]
                current_module.users_collection = users_collection
                current_module.interviews_collection = interviews_collection
                current_module.jobs_collection = jobs_collection
                current_module.questions_collection = questions_collection
                current_module.problems_collection = problems_collection
                
                logger.info("MongoDB connected successfully")
            except Exception as mongo_error:
                logger.error(f"MongoDB connection failed: {type(mongo_error).__name__}: {mongo_error}")
                raise
        
        # Initialize Redis
        if settings.REDIS_URL:
            try:
                redis_client = redis.from_url(settings.REDIS_URL)
                await redis_client.ping()
                logger.info("Redis connected successfully")
            except Exception as redis_error:
                logger.warning(f"Redis connection failed: {type(redis_error).__name__}: {redis_error}")
                logger.info("Continuing without Redis")
        
        # Create PostgreSQL tables
        if engine:
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            logger.info("PostgreSQL tables created successfully")
        else:
            logger.warning("PostgreSQL not available, running without database")
        
    except Exception as e:
        logger.warning(f"Database initialization failed: {e}")
        # Continue without databases for development

async def close_db():
    """Close database connections"""
    global mongo_client, redis_client
    
    if mongo_client:
        mongo_client.close()
    
    if redis_client:
        await redis_client.close()
    
    if engine:
        await engine.dispose()

async def get_db():
    """Get PostgreSQL database session"""
    if not AsyncSessionLocal:
        # Return a dummy session for development
        yield None
        return
        
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

def get_mongo_db():
    """Get MongoDB database"""
    logger.info(f"get_mongo_db called, mongo_db is: {mongo_db is not None}")
    return mongo_db

def get_redis():
    """Get Redis client"""
    return redis_client