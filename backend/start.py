#!/usr/bin/env python3
"""
NeuroHire AI Backend Startup Script
"""

import os
import sys
import subprocess
import asyncio
from pathlib import Path

def check_python_version():
    """Check if Python version is compatible"""
    if sys.version_info < (3, 8):
        print("❌ Python 3.8 or higher is required")
        sys.exit(1)
    print(f"✅ Python {sys.version_info.major}.{sys.version_info.minor} detected")

def check_dependencies():
    """Check if required dependencies are installed"""
    required_packages = [
        "fastapi",
        "uvicorn",
        "sqlalchemy",
        "asyncpg",
        "pymongo",
        "redis",
        "whisper",
        "opencv-python",
        "deepface",
        "librosa",
        "sentence-transformers"
    ]
    
    missing_packages = []
    
    for package in required_packages:
        try:
            __import__(package.replace("-", "_"))
            print(f"✅ {package}")
        except ImportError:
            missing_packages.append(package)
            print(f"❌ {package}")
    
    if missing_packages:
        print(f"\n❌ Missing packages: {', '.join(missing_packages)}")
        print("Run: pip install -r requirements.txt")
        return False
    
    return True

def check_environment():
    """Check environment setup"""
    env_file = Path(".env")
    
    if not env_file.exists():
        print("⚠️  .env file not found, using default configuration")
        print("Copy .env.example to .env and configure your settings")
    else:
        print("✅ .env file found")
    
    # Check storage directories
    storage_dirs = [
        "storage/audio",
        "storage/uploads", 
        "storage/models",
        "logs"
    ]
    
    for directory in storage_dirs:
        Path(directory).mkdir(parents=True, exist_ok=True)
    
    print("✅ Storage directories created")

def check_databases():
    """Check database connections"""
    print("\n🔍 Checking database connections...")
    
    # This would check actual database connections
    # For now, just show what needs to be running
    print("Make sure the following services are running:")
    print("  - PostgreSQL (default: localhost:5432)")
    print("  - MongoDB (default: localhost:27017)")
    print("  - Redis (default: localhost:6379)")
    print("\nYou can start them with: docker-compose up -d")

def start_server(host="0.0.0.0", port=8000, reload=True):
    """Start the FastAPI server"""
    print(f"\n🚀 Starting NeuroHire AI Backend on {host}:{port}")
    print(f"   Reload: {reload}")
    print(f"   API Docs: http://{host}:{port}/docs")
    print(f"   Health Check: http://{host}:{port}/health")
    
    try:
        import uvicorn
        uvicorn.run(
            "app.main:app",
            host=host,
            port=port,
            reload=reload,
            log_level="info"
        )
    except KeyboardInterrupt:
        print("\n👋 Server stopped")
    except Exception as e:
        print(f"❌ Error starting server: {e}")
        sys.exit(1)

def main():
    """Main startup function"""
    print("🧠 NeuroHire AI Backend Startup")
    print("=" * 40)
    
    # Change to backend directory
    backend_dir = Path(__file__).parent
    os.chdir(backend_dir)
    
    # Run checks
    check_python_version()
    
    print("\n📦 Checking dependencies...")
    if not check_dependencies():
        sys.exit(1)
    
    print("\n🔧 Checking environment...")
    check_environment()
    
    check_databases()
    
    # Parse command line arguments
    import argparse
    parser = argparse.ArgumentParser(description="Start NeuroHire AI Backend")
    parser.add_argument("--host", default="0.0.0.0", help="Host to bind to")
    parser.add_argument("--port", type=int, default=8000, help="Port to bind to")
    parser.add_argument("--no-reload", action="store_true", help="Disable auto-reload")
    parser.add_argument("--check-only", action="store_true", help="Only run checks, don't start server")
    
    args = parser.parse_args()
    
    if args.check_only:
        print("\n✅ All checks completed")
        return
    
    # Start server
    start_server(
        host=args.host,
        port=args.port,
        reload=not args.no_reload
    )

if __name__ == "__main__":
    main()