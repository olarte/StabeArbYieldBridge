#!/bin/bash
echo "🧹 Cleaning up ports..."

# Kill processes on common ports
for port in 3000 5000 8080; do
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>/dev/null; then
        echo "Killing process on port $port..."
        kill -9 $(lsof -ti:$port) 2>/dev/null || true
    fi
done

sleep 2

echo "🚀 Starting server..."
PORT=5000 node index.js
