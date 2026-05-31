@echo off
title AnalystOS Public Sharing Portal
color 0a
echo ======================================================================
echo                 ANALYSTOS INSTANT PUBLIC SHARING GATEWAY
echo ======================================================================
echo.
echo  This tool creates a secure public URL (HTTPS) on the internet
echo  so that ANYONE in the world can access your local website!
echo.
echo  [IMPORTANT] You must run "Launch-AnalystOS.bat" first so that
echo              the local server is active on Port 3000!
echo.
echo ======================================================================
echo  Generating secure public tunnel...
echo  (Press Ctrl+C at any time to stop public sharing)
echo ======================================================================
echo.
npx localtunnel --port 3000
if %errorlevel% neq 0 (
    echo.
    echo  Failed to start the public sharing tunnel.
    echo  Please ensure you are connected to the internet and have Node.js!
    echo.
    pause
)
