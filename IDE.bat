@echo off
rem Starts the browser-based AzLang Studio on http://127.0.0.1:4173/ide.html
cd /d "%~dp0"
node studio-server.js %*
