@echo off
rem Launcher for setup.ps1: double-click. Keeps the window open and writes any error to SDD\.logs
setlocal
set "ROOT=%~dp0..\.."
if not exist "%ROOT%\.logs" mkdir "%ROOT%\.logs"
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { & '%~dp0setup.ps1' %* } catch { $_ | Out-String | Tee-Object -FilePath '%ROOT%\.logs\setup-launch-error.log'; Write-Host 'ERROR - see .logs' -ForegroundColor Red }"
echo.
echo Exit code: %ERRORLEVEL%
pause
