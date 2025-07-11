#!/bin/bash

# Start KubeCloud Electron Development Environment

echo "🚀 Starting KubeCloud Desktop App Development..."

# Function to cleanup background processes
cleanup() {
    echo "🛑 Stopping all processes..."
    kill $REACT_PID $SERVER_PID 2>/dev/null
    exit
}

# Set up signal handling
trap cleanup SIGINT SIGTERM

# Start the backend server
echo "📡 Starting backend server..."
cd ../server
npm start &
SERVER_PID=$!

# Wait for server to start
sleep 3

# Start React development server
echo "⚛️  Starting React development server..."
cd ../client
npm start &
REACT_PID=$!

# Wait for React to start
echo "⏳ Waiting for React development server to start..."
sleep 10

# Start Electron
echo "🖥️  Starting Electron..."
npm run electron-dev

# Keep script running
wait 