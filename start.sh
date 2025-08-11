#!/bin/bash
# Fathy Robot System Startup Script (for FastAPI)

echo "🤖 Starting Fathy Robot Control System..."
echo "=================================="

# Check if virtual environment exists in the root directory
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install/update dependencies from requirements.txt in the root directory
echo "📥 Installing dependencies..."
pip install -r requirements.txt

# Start the FastAPI server using Uvicorn
# We run this from the root directory so Uvicorn can find the 'server.app' module.
echo "🚀 Starting FastAPI server with Uvicorn..."
echo "Interactive API docs will be available at http://localhost:5000/docs"
echo "Touch interface will be available at http://localhost:5000"
uvicorn app:app --host 0.0.0.0 --port 5000 --reload
