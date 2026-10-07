Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  TMO Grading Queue - Database Startup & Connection" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

$service = Get-Service -Name "MSSQLSERVER" -ErrorAction SilentlyContinue
if (-not $service) {
    Write-Warning "MSSQLSERVER service not found on this machine."
    exit 1
}

if ($service.Status -ne 'Running') {
    Write-Host "SQL Server service is $($service.Status). Requesting Administrator permission to start..." -ForegroundColor Yellow
    Start-Process powershell -Verb RunAs -Wait -ArgumentList "-Command", "Start-Service MSSQLSERVER; Write-Host 'MSSQLSERVER service started!' -ForegroundColor Green"
} else {
    Write-Host "SQL Server service (MSSQLSERVER) is already RUNNING." -ForegroundColor Green
}

Write-Host "`nTesting backend database connection..." -ForegroundColor Cyan
Set-Location "$PSScriptRoot\backend"
npm run check:db

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nRunning database migrations..." -ForegroundColor Green
    npm run migrate
    Write-Host "`nDatabase is ready for TMO Grading Queue!" -ForegroundColor Green
} else {
    Write-Error "Database connection failed. Please check backend/.env configuration."
}
