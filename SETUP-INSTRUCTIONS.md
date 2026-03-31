# NeuroHire Compiler Setup Instructions

## 🐳 Docker Desktop Setup

### 1. Install Docker Desktop
- Download from: https://www.docker.com/products/docker-desktop
- Install and restart if prompted
- Start Docker Desktop application
- Wait for Docker to fully start (green whale icon in system tray)

### 2. Verify Docker Installation
Open PowerShell and run:
```powershell
docker --version
docker ps
```
You should see Docker version and an empty container list.

### 3. Run Setup Script
In your project directory, run:
```powershell
.\setup-compiler.ps1
```

## 🚀 Expected Output
```
🚀 Setting up NeuroHire Full Compiler System...
📋 Supported Languages: Python, Java, C++, C
🐳 Checking Docker...
✅ Docker found: Docker version 24.x.x
✅ Docker is running
📦 Building Docker compiler image...
✅ Docker image built successfully!
📚 Installing server dependencies...
✅ Dependencies installed successfully!
📁 Creating execution directory...
✅ Setup complete!
```

## 🔧 Start the System
```powershell
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend  
npm run dev
```

## 🌐 Access the Application
- Frontend: http://localhost:3000
- Coding Interface: http://localhost:3000/candidate/technical-coding

## 🧪 Test the Compiler
1. Go to the coding interface
2. Select a language (Python, Java, C++, or C)
3. Write a simple program
4. Click "Run" to test execution

## 🐛 Troubleshooting

### Docker Issues
```powershell
# Restart Docker Desktop
# Check if Docker is running
docker ps

# Rebuild image if needed
docker build -f Dockerfile.compiler -t neurohire-compiler:latest .
```

### Port Issues
```powershell
# Check if ports are in use
netstat -an | findstr :3000
netstat -an | findstr :5000
```

### Permission Issues
```powershell
# Run PowerShell as Administrator if needed
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```