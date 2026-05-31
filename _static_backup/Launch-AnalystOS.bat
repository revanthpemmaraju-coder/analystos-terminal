@echo off
title AnalystOS Terminal Launcher
color 0b
echo ======================================================================
echo                 ANALYSTOS FULL-STACK TERMINAL LAUNCHER
echo ======================================================================
echo.
echo  [1] Starting the Node.js secure API Gateway on http://localhost:3000...
echo  [2] Serving the Three.js 3D interactive graphics...
echo  [3] Loading Rupee DCF valuation models...
echo.
echo ======================================================================
echo  Server is starting up...
echo  We are automatically opening the app at http://localhost:3000 in your browser!
echo  Please keep this command window open while using the website!
echo ======================================================================
echo.
start http://localhost:3000
npm start
if %errorlevel% neq 0 (
    echo.
    echo  Error: Failed to start the server. 
    echo  Please ensure you have Node.js installed on your machine!
    echo.
    pause
)
