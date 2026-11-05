@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\setup-mail.ps1"
set "SITE_EXIT_CODE=%ERRORLEVEL%"
echo.
pause
exit /b %SITE_EXIT_CODE%
