@echo off
title AnalystOS Static Web Launcher
color 0b
echo ======================================================================
echo                 ANALYSTOS STANDALONE STATIC WEB VIEWER
echo ======================================================================
echo.
echo  This tool will launch the compiled "dist" folder as a fully 
echo  functional website on your local machine using a fast, lightweight server.
echo.
echo ======================================================================
echo  Server is starting up on http://localhost:5000...
echo  We are automatically opening the website in your browser!
echo ======================================================================
echo.
start http://localhost:5000
npx -y serve -s dist -l 5000
if %errorlevel% neq 0 (
    echo.
    echo  Failed to start the static viewer.
    echo  Please ensure you have Node.js installed!
    echo.
    pause
)
