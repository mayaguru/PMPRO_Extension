@echo off
cd /d "%~dp0"
echo Starting VR Server with uv...
uv run vr_server.py
pause
