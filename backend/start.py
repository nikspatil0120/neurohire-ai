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
    # Core packages required to run the server
    core_packages = [
        "fastapi",
        "uvicorn",
        "pymongo",
    ]
    
    # Optional packages (AI features run in mock mode if missing)
    optional_packages = [
        "sqlalchemy",
        "asyncpg",
        "redis",
        "whisper",
        "opencv-python",
        "deepface",
        "librosa",
        "sentence-transformers"
    ]
    
    missing_core = []
    missing_optional = []
    
    print("Core packages:")
    for package in core_packages:
        try:
            __import__(package.replace("-", "_"))
            print(f"  ✅ {package}")
        except ImportError:
            missing_core.append(package)
            print(f"  ❌ {package}")
    
    print("\nOptional packages (AI features):")
    for package in optional_packages:
        try:
            __import__(package.replace("-", "_"))
            print(f"  ✅ {package}")
        except ImportError:
            missing_optional.append(package)
            print(f"  ⚠️  {package} (will use mock mode)")
    
    if missing_core:
        print(f"\n❌ Missing REQUIRED packages: {', '.join(missing_core)}")
        print("Run: pip install fastapi uvicorn motor pymongo")
        return False
    
    if missing_optional:
        print(f"\n⚠️  Optional AI packages missing - AI features will run in MOCK mode")
        print("This is OK for basic testing and development!")
    
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
    print("\n🔍 Database Information:")
    print("  MongoDB: Required (check .env for MONGODB_URL)")
    print("  PostgreSQL: Optional (not needed if using MongoDB only)")
    print("  Redis: Optional (caching will be disabled if not available)")
    print("\n💡 The backend will run with MongoDB only!")

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