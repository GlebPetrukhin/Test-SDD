# Установка схем openspec-sdd без Node.js: копирует schemas\* в пользовательскую папку OpenSpec
# (%LOCALAPPDATA%\openspec\schemas, или $env:XDG_DATA_HOME\openspec\schemas). Полная версия: openspec-sdd install.
$ErrorActionPreference = 'Stop'
$pkg = Get-Content (Join-Path $PSScriptRoot 'package.json') -Raw | ConvertFrom-Json
$base = if ($env:XDG_DATA_HOME) { Join-Path $env:XDG_DATA_HOME 'openspec' }
        elseif ($env:LOCALAPPDATA) { Join-Path $env:LOCALAPPDATA 'openspec' }
        else { Join-Path $HOME 'AppData\Local\openspec' }
$target = Join-Path $base 'schemas'
New-Item -ItemType Directory -Force -Path $target | Out-Null
Get-ChildItem (Join-Path $PSScriptRoot 'schemas') -Directory | ForEach-Object {
    $dst = Join-Path $target $_.Name
    if (Test-Path $dst) { Remove-Item -Recurse -Force $dst }
    Copy-Item -Recurse $_.FullName $dst
    $marker = @{ package = $pkg.name; version = $pkg.version; installer = 'install.ps1' } | ConvertTo-Json
    [IO.File]::WriteAllText((Join-Path $dst '.openspec-sdd.json'), $marker, (New-Object Text.UTF8Encoding $false))
    Write-Host "  схема $($_.Name) -> $dst"
}
Write-Host "$($pkg.name) $($pkg.version): схемы установлены в $target"
