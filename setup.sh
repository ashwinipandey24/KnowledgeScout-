#!/bin/bash

echo "Starting KnowledgeScout..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "npm is not installed. Please install npm first."
    exit 1
fi

# Install root dependencies
echo "Installing root dependencies..."
npm install

# Install server dependencies
echo "Installing server dependencies..."
cd server
npm install
cd ..

# Install client dependencies
echo "Installing client dependencies..."
cd client
npm install
cd ..

echo "All dependencies installed successfully!"
echo ""
echo "To start the application:"
echo "  npm run dev"
echo ""
echo "This will start both the backend server (port 5000) and frontend (port 3000)"
echo "Access the application at: http://localhost:3000"



