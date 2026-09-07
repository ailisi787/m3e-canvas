@echo off
title OpenCode AI Proxy (localhost:8787)
echo Starting the local AI proxy for M3E Canvas...
echo.
node "%~dp0tools\opencode-proxy.mjs"
echo.
echo The proxy has stopped.
pause
