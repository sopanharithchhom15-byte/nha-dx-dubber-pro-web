@echo off
title Nha DX Dubber Pro Web App
cd /d "%~dp0"
echo ========================================================
echo    Starting Nha DX Dubber Pro Web App Server...
echo ========================================================
echo.
echo Opening browser at http://localhost:3000 ...
start http://localhost:3000
echo.
node server.js
pause
