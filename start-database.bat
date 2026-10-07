@echo off
title TMO Grading Queue - Start Database and Migrate
echo ========================================================
echo   TMO Grading Queue - Database Startup ^& Connection
echo ========================================================
echo.
echo Starting SQL Server service (MSSQLSERVER)...
powershell -Command "Start-Process powershell -Verb RunAs -Wait -ArgumentList '-Command', 'Start-Service MSSQLSERVER; Write-Host SQL Server service started successfully!'"

echo.
echo Checking database connection from backend...
cd /d "%~dp0backend"
call npm run check:db
if %errorlevel% equ 0 (
    echo.
    echo Running database migrations...
    call npm run migrate
    echo.
    echo Database is ready!
) else (
    echo.
    echo [ERROR] Could not connect to SQL Server.
    echo Please make sure MSSQLSERVER is started and credentials in backend/.env are valid.
)
pause
