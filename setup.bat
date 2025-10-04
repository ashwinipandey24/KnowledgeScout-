@echo off
echo Starting KnowledgeScout...

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo Node.js is not installed. Please install Node.js first.
    exit /b 1
)

REM Check if npm is installed
npm --version >nul 2>&1
if errorlevel 1 (
    echo npm is not installed. Please install npm first.
    exit /b 1
)

REM Install root dependencies
echo Installing root dependencies...
npm install

REM Install server dependencies
echo Installing server dependencies...
cd server
npm install
cd ..

REM Install client dependencies
echo Installing client dependencies...
cd client
npm install
cd ..

echo All dependencies installed successfully!
echo.
echo To start the application:
echo   npm run dev
echo.
echo This will start both the backend server (port 5000) and frontend (port 3000)
echo Access the application at: http://localhost:3000
pause



