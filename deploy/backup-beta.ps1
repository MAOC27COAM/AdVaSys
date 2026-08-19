$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$envFile = Join-Path $scriptDir ".env"
$composeFile = Join-Path $scriptDir "docker-compose.beta.yml"
$backupDir = Join-Path $scriptDir "runtime\\backups"

New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

$postgresUser = "intranet"
$postgresDb = "intranet_db"

Get-Content $envFile | ForEach-Object {
  if ($_ -match "^POSTGRES_USER=(.+)$") {
    $script:postgresUser = $Matches[1].Trim()
  }

  if ($_ -match "^POSTGRES_DB=(.+)$") {
    $script:postgresDb = $Matches[1].Trim()
  }
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupFile = Join-Path $backupDir "postgres-$timestamp.sql"

Push-Location $scriptDir
try {
  docker compose --env-file $envFile -f $composeFile exec -T db pg_dump -U $postgresUser -d $postgresDb > $backupFile
} finally {
  Pop-Location
}

Write-Host "Backup generado en: $backupFile"
