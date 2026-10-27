# Обёртка: основной скрипт версионируется в sdd-specs\workspace\deploy.ps1
param([string]$Version = 'dev')
& (Join-Path $PSScriptRoot 'sdd-specs\workspace\deploy.ps1') -Version $Version
