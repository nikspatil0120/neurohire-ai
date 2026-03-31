# NeuroHire Full Compiler Setup Script for Windows (Python, Java, C++, C)

Write-Host "🚀 Setting up NeuroHire Full Compiler System..." -ForegroundColor Green
Write-Host "📋 Supported Languages: Python, Java, C++, C" -ForegroundColor Cyan

# Check if Docker is installed and running
Write-Host "🐳 Checking Docker..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version
    Write-Host "✅ Docker found: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker not found! Please install Docker Desktop first." -ForegroundColor Red
    Write-Host "Download from: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
    exit 1
}

# Check if Docker is running
try {
    docker ps | Out-Null
    Write-Host "✅ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker is not running! Please start Docker Desktop." -ForegroundColor Red
    exit 1
}

# Build Docker image
Write-Host "📦 Building Docker compiler image..." -ForegroundColor Yellow
docker build -f Dockerfile.compiler -t neurohire-compiler:latest .

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Docker image built successfully!" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to build Docker image!" -ForegroundColor Red
    exit 1
}

# Install server dependencies
Write-Host "📚 Installing server dependencies..." -ForegroundColor Yellow
Set-Location server
npm install dockerode

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Dependencies installed successfully!" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to install dependencies!" -ForegroundColor Red
    exit 1
}

# Go back to root directory
Set-Location ..

# Create temp directory for executions (Windows equivalent)
Write-Host "📁 Creating execution directory..." -ForegroundColor Yellow
$tempDir = "$env:TEMP\neurohire-executions"
if (!(Test-Path $tempDir)) {
    New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
    Write-Host "✅ Created directory: $tempDir" -ForegroundColor Green
} else {
    Write-Host "✅ Directory already exists: $tempDir" -ForegroundColor Green
}

Write-Host ""
Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "🔧 To start the system:" -ForegroundColor Cyan
Write-Host "1. Start backend: cd server; npm run dev" -ForegroundColor White
Write-Host "2. Start frontend: npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "🐳 Docker image 'neurohire-compiler:latest' is ready for code execution" -ForegroundColor Cyan
Write-Host "📂 Execution workspace: $tempDir" -ForegroundColor Cyan
Write-Host "🔤 Supported: Python 3.10, Java 17, GCC 11 (C/C++)" -ForegroundColor Cyan