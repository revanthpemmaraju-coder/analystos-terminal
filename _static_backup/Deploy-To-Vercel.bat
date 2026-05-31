@echo off
title AnalystOS Vercel Launcher
color 0e
echo ======================================================================
echo                 ANALYSTOS VERCEL DEPLOYMENT PORTAL
echo ======================================================================
echo.
echo  This tool will build and publish your website globally on Vercel!
echo  It will run in a secure, serverless cloud environment.
echo.
echo  [1] Building production Three.js graphics...
echo  [2] Bundling secure serverless functions...
echo  [3] Launching Vercel deployment...
echo.
echo ======================================================================
echo  Starting deployment...
echo  If this is your first time, Vercel will ask you to log in in your browser.
echo ======================================================================
echo.
npx -y vercel --prod
if %errorlevel% neq 0 (
    echo.
    echo  Vercel deployment encountered an error or was closed.
    echo  Please ensure you are logged into Vercel and connected to the internet!
    echo.
    pause
)
