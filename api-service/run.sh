#!/bin/bash

# Script to run the FastAPI server

cd "$(dirname "$0")"

# Activate virtual environment
source venv/bin/activate

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  Warning: .env file not found!"
    echo "📝 Please create .env file from .env.example"
    echo ""
fi

# Run the server
echo "Starting Neighborhood Library Service API..."
echo "API will be available at http://localhost:9002"
echo "API Documentation at http://localhost:9002/docs"
echo ""
uvicorn main:app --reload --host 0.0.0.0 --port 9002

