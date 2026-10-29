@echo off
chcp 65001 >nul
node "%~dp0azlang.js" %*
if errorlevel 1 pause
