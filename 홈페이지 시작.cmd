@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\manage-site.ps1" -Action Start
set "SITE_EXIT_CODE=%ERRORLEVEL%"
echo.
pause
exit /b %SITE_EXIT_CODE%
