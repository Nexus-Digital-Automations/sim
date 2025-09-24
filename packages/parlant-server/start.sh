#!/bin/bash

# Parlant Server Startup Script
# This script starts the Parlant server with proper error handling and logging

set -e  # Exit on any error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🚀 Starting Parlant Server - Sim Integration"
echo "📁 Working directory: $SCRIPT_DIR"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "⚠️  Virtual environment not found. Creating one..."
    python3 -m venv venv
    echo "✅ Virtual environment created"
fi

# Activate virtual environment
echo "🔄 Activating virtual environment..."
source venv/bin/activate

# Check if requirements are installed
if [ ! -f "venv/pyvenv.cfg" ] || [ ! -f "venv/lib/python*/site-packages/parlant/__init__.py" ]; then
    echo "📦 Installing/updating Python dependencies..."
    pip install --upgrade pip
    pip install -r requirements.txt
    echo "✅ Dependencies installed"
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  Environment file not found"
    echo "📋 Please copy .env.example to .env and configure it:"
    echo "   cp .env.example .env"
    echo "   # Then edit .env with your configuration"
    exit 1
fi

# Validate environment
echo "🔍 Validating environment configuration..."
python3 -c "
from config.settings import get_settings
try:
    settings = get_settings()
    print('✅ Environment configuration valid')
    print(f'   Database URL: {settings.get_database_url().split(\"@\")[0] if \"@\" in settings.get_database_url() else \"Not configured\"}@***')
    print(f'   Sim App URL: {settings.sim_app_url}')
    print(f'   Server: {settings.host}:{settings.port}')
except Exception as e:
    print(f'❌ Environment configuration error: {e}')
    exit(1)
"

# Start the server
echo "🌟 Starting Parlant server..."
echo "📝 Log level: INFO"
echo "🌐 Access the server at: http://localhost:8001"
echo "📚 API documentation: http://localhost:8001/docs"
echo "🔄 Press Ctrl+C to stop the server"
echo ""

# Use uvicorn to run the FastAPI server
python3 -m uvicorn main:app \
    --host 0.0.0.0 \
    --port 8001 \
    --reload \
    --log-level info \
    --access-log \
    --loop asyncio

echo "👋 Parlant server stopped"