#!/bin/bash

# Parlant Server Installation Script
# ==================================
# This script sets up the Parlant Python server environment for Sim integration

set -e  # Exit on any error

echo "🚀 Installing Parlant Server for Sim..."

# Check Python version
echo "📋 Checking Python installation..."
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not installed"
    exit 1
fi

PYTHON_VERSION=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
echo "✅ Python $PYTHON_VERSION detected"

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "📦 Creating Python virtual environment..."
    python3 -m venv venv
    echo "✅ Virtual environment created"
else
    echo "✅ Virtual environment already exists"
fi

# Activate virtual environment
echo "🔄 Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
echo "⬆️  Upgrading pip..."
pip install --upgrade pip

# Install dependencies
if [ -f "requirements.txt" ]; then
    echo "📥 Installing Python dependencies..."
    pip install -r requirements.txt
    echo "✅ Dependencies installed"
else
    echo "⚠️  requirements.txt not found, installing parlant directly..."
    pip install parlant
    echo "✅ Parlant installed"
fi

# Create .env file from example if it doesn't exist
if [ ! -f ".env" ] && [ -f ".env.example" ]; then
    echo "🔧 Creating .env file from template..."
    cp .env.example .env
    echo "✅ .env file created"
    echo "⚠️  Please update .env with your actual configuration values"
fi

# Check if server can import successfully
echo "🧪 Testing server import..."
if python -c "import server; print('✅ Server imports successfully')" 2>/dev/null; then
    echo "✅ Installation test passed"
else
    echo "⚠️  Server import test failed - please check dependencies"
fi

echo ""
echo "🎉 Parlant Server installation completed!"
echo ""
echo "Next steps:"
echo "1. Update .env file with your configuration"
echo "2. Set DATABASE_URL to your PostgreSQL connection string"
echo "3. Set OPENAI_API_KEY for AI model access"
echo "4. Run 'python server.py' to start the server"
echo ""
echo "For development:"
echo "- Run 'source venv/bin/activate' to activate the virtual environment"
echo "- Run 'python server.py' to start the server"
echo "- Server will be available at http://localhost:8001"
echo "- API documentation at http://localhost:8001/docs"
echo ""