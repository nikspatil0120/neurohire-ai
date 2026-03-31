#!/bin/bash

# NeuroHire Full Compiler Setup Script (Python, Java, C++, C)

echo "🚀 Setting up NeuroHire Full Compiler System..."
echo "📋 Supported Languages: Python, Java, C++, C"

# Build Docker image
echo "📦 Building Docker compiler image..."
docker build -f Dockerfile.compiler -t neurohire-compiler:latest .

# Install server dependencies
echo "📚 Installing server dependencies..."
cd server
npm install dockerode

# Create temp directory for executions
echo "📁 Creating execution directory..."
sudo mkdir -p /tmp/neurohire-executions
sudo chmod 777 /tmp/neurohire-executions

echo "✅ Setup complete!"
echo ""
echo "🔧 To start the system:"
echo "1. Start backend: cd server && npm run dev"
echo "2. Start frontend: npm run dev"
echo ""
echo "🐳 Docker image 'neurohire-compiler:latest' is ready for code execution"
echo "📂 Execution workspace: /tmp/neurohire-executions"
echo "🔤 Supported: Python 3.10, Java 17, GCC 11 (C/C++)"