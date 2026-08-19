$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$envFile = Join-Path $scriptDir ".env"
$composeFile = Join-Path $scriptDir "docker-compose.beta.yml"

Push-Location $scriptDir
try {
  docker compose --env-file $envFile -f $composeFile down
} finally {
  Pop-Location
}

Write-Host "Servicios beta detenidos."
