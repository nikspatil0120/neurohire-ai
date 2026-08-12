from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import time
import logging

from app.config import settings
from app.core.database import init_db, close_db
from app.utils.logger import setup_logging, APILogger, SecurityLogger
from app.api import auth, users, jobs, interviews, websocket, problems, admin, aptitude

# Setup logging
setup_logging(log_level="INFO" if not settings.DEBUG else "DEBUG")
logger = logging.getLogger(__name__)

# Initialize specialized loggers
api_logger = APILogger()
security_logger = SecurityLogger()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    logger.info("Starting NeuroHire AI Backend...")
    
    try:
        await init_db()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
        raise
    
    # Create storage directories
    import os
    storage_dirs = [
        "storage/audio/questions",
        "storage/audio/responses", 
        "storage/uploads/resumes",
        "storage/uploads/avatars",
        "storage/models",
        "logs/interviews",
        "logs/security"
    ]
    
    for directory in storage_dirs:
        os.makedirs(directory, exist_ok=True)
    
    logger.info("Storage directories created")
    logger.info("NeuroHire AI Backend started successfully")
    
    yield
    
    # Shutdown
    logger.info("Shutting down NeuroHire AI Backend...")
    await close_db()
    logger.info("NeuroHire AI Backend shutdown complete")

# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    description="AI-powered interview platform backend",
    version=settings.VERSION,
    debug=settings.DEBUG,
    lifespan=lifespan
)

# Add middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=settings.allowed_hosts_list
)

# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all HTTP requests"""
    start_time = time.time()
    
    # Get client IP
    client_ip = request.client.host if request.client else "unknown"
    
    # Get user ID from token if available
    user_id = None
    try:
        auth_header = request.headers.get("authorization")
        if auth_header and auth_header.startswith("Bearer "):
            # This would decode the token to get user ID
            # For now, we'll skip this to avoid circular imports
            pass
    except:
        pass
    
    # Log request
    api_logger.log_request(
        method=request.method,
        path=str(request.url.path),
        user_id=user_id,
        ip=client_ip
    )
    
    # Process request
    try:
        response = await call_next(request)
        
        # Calculate duration
        duration = time.time() - start_time
        
        # Log response
        api_logger.log_response(
            method=request.method,
            path=str(request.url.path),
            status_code=response.status_code,
            duration=duration
        )
        
        return response
        
    except Exception as e:
        duration = time.time() - start_time
        
        # Log error
        api_logger.log_error(
            method=request.method,
            path=str(request.url.path),
            error=str(e),
            user_id=user_id
        )
        
        # Log security event if it's an unauthorized access
        if "401" in str(e) or "403" in str(e):
            security_logger.log_unauthorized_access(
                path=str(request.url.path),
                user_id=user_id,
                ip=client_ip
            )
        
        raise

# Exception handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail,
            "status_code": exc.status_code,
            "timestamp": time.time()
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle general exceptions"""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "status_code": 500,
            "timestamp": time.time()
        }
    )

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "app_name": settings.APP_NAME,
        "version": settings.VERSION,
        "timestamp": time.time()
    }

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": f"Welcome to {settings.APP_NAME}",
        "version": settings.VERSION,
        "docs": "/docs",
        "health": "/health"
    }

# Include routers
app.include_router(auth.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(jobs.router, prefix="/api/v1")
app.include_router(interviews.router, prefix="/api/v1")
app.include_router(websocket.router, prefix="/api/v1")
app.include_router(problems.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")
app.include_router(aptitude.router, prefix="/api/v1")

# Additional endpoints
@app.get("/api/v1/system/info")
async def system_info():
    """Get system information"""
    return {
        "app_name": settings.APP_NAME,
        "version": settings.VERSION,
        "debug": settings.DEBUG,
        "features": {
            "ai_interview": True,
            "emotion_detection": True,
            "voice_analysis": True,
            "real_time_processing": True,
            "adaptive_questioning": True
        }
    }

@app.get("/api/v1/system/stats")
async def system_stats():
    """Get system statistics (admin only)"""
    # This would require admin authentication
    # For now, return placeholder data
    return {
        "total_users": 0,
        "total_interviews": 0,
        "active_sessions": 0,
        "uptime": time.time()
    }

if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level="info"
    )