# Quick Docker Test Script for NeuroHire

Write-Host "🧪 Testing Docker Setup for NeuroHire Compiler..." -ForegroundColor Green

# Test 1: Check Docker version
Write-Host "`n1️⃣ Testing Docker installation..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version
    Write-Host "✅ $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker not found!" -ForegroundColor Red
    exit 1
}

# Test 2: Check if Docker is running
Write-Host "`n2️⃣ Testing Docker daemon..." -ForegroundColor Yellow
try {
    docker ps | Out-Null
    Write-Host "✅ Docker daemon is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker daemon not running! Start Docker Desktop." -ForegroundColor Red
    exit 1
}

# Test 3: Test basic container
Write-Host "`n3️⃣ Testing container execution..." -ForegroundColor Yellow
try {
    $result = docker run --rm hello-world 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Container execution works" -ForegroundColor Green
    } else {
        Write-Host "❌ Container execution failed" -ForegroundColor Red
        Write-Host $result -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Failed to run test container" -ForegroundColor Red
}

# Test 4: Check available resources
Write-Host "`n4️⃣ Checking system resources..." -ForegroundColor Yellow
try {
    $info = docker system info --format "{{.NCPU}} CPUs, {{.MemTotal}} memory" 2>$null
    Write-Host "✅ Available: $info" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Could not get system info" -ForegroundColor Yellow
}

Write-Host "`n🎉 Docker test complete! Ready for NeuroHire setup." -ForegroundColor Green
Write-Host "Next step: Run .\setup-compiler.ps1" -ForegroundColor Cyan