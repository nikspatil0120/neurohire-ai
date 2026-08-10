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
    engine = create_async_engine(
        settings.POSTGRES_URL.replace("postgresql://", "postgresql+asyncpg://"),
        echo=settings.DEBUG
    )
except Exception as e:
    logger.warning(f"PostgreSQL connection failed: {e}")
    # Create a dummy engine for development
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
        if settings.MONGODB_URL:
            mongo_client = AsyncIOMotorClient(settings.MONGODB_URL)
            mongo_db = mongo_client[settings.MONGODB_DB]
            
            # Initialize collections
            users_collection = mongo_db["users"]
            interviews_collection = mongo_db["interviews"]
            jobs_collection = mongo_db["jobs"]
            questions_collection = mongo_db["questions"]
            problems_collection = mongo_db["problems"]
            
            logger.info("MongoDB connected successfully")
        
        # Initialize Redis
        if settings.REDIS_URL:
            redis_client = redis.from_url(settings.REDIS_URL)
            await redis_client.ping()
            logger.info("Redis connected successfully")
        
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
    return mongo_db

def get_redis():
    """Get Redis client"""
    return redis_client