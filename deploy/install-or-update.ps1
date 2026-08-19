$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$envFile = Join-Path $scriptDir ".env"
$envExample = Join-Path $scriptDir ".env.example"
$composeFile = Join-Path $scriptDir "docker-compose.beta.yml"
$runtimeDir = Join-Path $scriptDir "runtime"

function Test-Command {
  param([string]$Name)
  return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

function Get-ComposeCommand {
  if (Test-Command "docker") {
    $composeVersion = & docker compose version 2>$null
    if ($LASTEXITCODE -eq 0) {
      return @("docker", "compose")
    }
  }

  throw "Docker Compose no esta disponible. Instala Docker Desktop y vuelve a intentarlo."
}

if (-not (Test-Path $envFile)) {
  Copy-Item $envExample $envFile
  Write-Host "Se creo deploy/.env a partir de .env.example. Revisa las credenciales antes de usar el sistema en produccion."
}

New-Item -ItemType Directory -Force -Path $runtimeDir | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $runtimeDir "postgres-data") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $runtimeDir "uploads") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $runtimeDir "tmp") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $runtimeDir "backups") | Out-Null

$compose = Get-ComposeCommand

Push-Location $scriptDir
try {
  & $compose[0] $compose[1] --env-file $envFile -f $composeFile up -d --build
} finally {
  Pop-Location
}

$appPort = ""
Get-Content $envFile | ForEach-Object {
  if ($_ -match "^APP_PORT=(.+)$") {
    $script:appPort = $Matches[1].Trim()
  }
}

if (-not $appPort) {
  $appPort = "8080"
}

$localIPv4s = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
  Where-Object { $_.IPAddress -notlike "127.*" -and $_.PrefixOrigin -ne "WellKnown" } |
  Select-Object -ExpandProperty IPAddress -Unique

Write-Host ""
Write-Host "Despliegue beta completado."
Write-Host "URL local principal: http://localhost:$appPort"

foreach ($ip in $localIPv4s) {
  Write-Host "URL en red local: http://$ip`:$appPort"
}

Write-Host ""
Write-Host "Para detener el sistema ejecuta: deploy\\stop-beta.ps1"