@echo off
cd /d "%~dp0"
set "HF_HOME=%~dp0.kokoro\hf"
".kokoro\Scripts\python.exe" kokoro_server.py
if errorlevel 1 pause

