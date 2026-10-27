# Первичная настройка рабочего места SDD на Windows (PowerShell 5.1 / 7).
# Запуск из любой папки: .\sdd-specs\workspace\setup.ps1   (или .\setup.ps1 в корне SDD)
$ErrorActionPreference = 'Stop'
$SddRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$LogDir = Join-Path $SddRoot '.logs'
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
Start-Transcript -Path (Join-Path $LogDir "setup-$(Get-Date -Format 'yyyyMMdd-HHmmss').log") | Out-Null
Write-Host "Лог: $LogDir"
trap { Write-Host "ОШИБКА: $_" -ForegroundColor Red; try { Stop-Transcript | Out-Null } catch {}; Read-Host 'Нажмите Enter, чтобы закрыть окно'; exit 1 }
$env:OPENSPEC_TELEMETRY = '0'
$problems = @()

function Test-Tool([string]$Name, [string]$Hint) {
    if (Get-Command $Name -ErrorAction SilentlyContinue) { return $true }
    $script:problems += "$Name не найден - $Hint"; return $false
}

Write-Host "== 0. Файлы в корне SDD (README, запускалки, SDD.code-workspace)" -ForegroundColor Cyan
Get-ChildItem (Join-Path $PSScriptRoot 'root') -File | ForEach-Object { Copy-Item $_.FullName (Join-Path $SddRoot $_.Name) -Force; Write-Host "  $($_.Name)" }

Write-Host "== 1. Проверка инструментов" -ForegroundColor Cyan
Test-Tool git     'winget install Git.Git' | Out-Null
if (Test-Tool node 'winget install OpenJS.NodeJS.LTS  (нужен 22.22.3+ или 24.15+)') {
    $nv = [version]((node -v).TrimStart('v'))
    if (-not (($nv.Major -eq 22 -and $nv -ge [version]'22.22.3') -or ($nv.Major -eq 24 -and $nv -ge [version]'24.15.0') -or $nv.Major -ge 26)) {
        $problems += "Node.js $nv не подходит Angular 22 - нужен 22.22.3+ или 24.15+"
    }
}
if (Test-Tool dotnet 'winget install Microsoft.DotNet.SDK.10') {
    if (-not ((dotnet --list-sdks) -match '^10\.')) { $problems += '.NET SDK 10 не установлен - winget install Microsoft.DotNet.SDK.10' }
}
Test-Tool docker  'Docker Desktop (winget install Docker.DockerDesktop) или Rancher Desktop; в настройках включить Kubernetes' | Out-Null
Test-Tool kubectl 'ставится вместе с Docker Desktop / Rancher Desktop или winget install Kubernetes.kubectl' | Out-Null

Write-Host "== 2. OpenSpec CLI" -ForegroundColor Cyan
if (-not (Get-Command openspec -ErrorAction SilentlyContinue)) {
    if (Get-Command npm -ErrorAction SilentlyContinue) { npm install -g @fission-ai/openspec@latest }
    else { Invoke-RestMethod https://raw.githubusercontent.com/Fission-AI/OpenSpec/main/scripts/binary/install.ps1 | Invoke-Expression }
    $env:Path = [Environment]::GetEnvironmentVariable('Path','User') + ';' + [Environment]::GetEnvironmentVariable('Path','Machine')
}
openspec --version

Write-Host "== 2b. Дополнение openspec-sdd (схема процесса sdd поверх стандартного OpenSpec)" -ForegroundColor Cyan
$ext = Join-Path $SddRoot 'openspec-sdd'
if (-not (Test-Path (Join-Path $ext 'package.json'))) {
    $problems += "нет папки openspec-sdd в $SddRoot - склонируйте репозиторий openspec-sdd рядом с sdd-specs и запустите setup снова"
} elseif (Get-Command node -ErrorAction SilentlyContinue) {
    npm install -g $ext --no-audit --no-fund | Out-Null
    node (Join-Path $ext 'bin\openspec-sdd.mjs') install
} else {
    & (Join-Path $ext 'install.ps1')
    $problems += 'команды openspec-sdd (trace-check, merge-test-cases) требуют Node.js - схема sdd установлена без них'
}

Write-Host "== 3. Регистрация store sdd-specs" -ForegroundColor Cyan
$stores = (openspec store list --json | Out-String | ConvertFrom-Json).stores
$existing = $stores | Where-Object { $_.id -eq 'sdd-specs' }
if ($existing) { Write-Host "Уже зарегистрирован: $($existing.root)" }
else { openspec store register (Join-Path $SddRoot 'sdd-specs') }

Write-Host "== 4. Расширенный набор команд OpenSpec" -ForegroundColor Cyan
openspec config set profile custom | Out-Null
$cfgPath = (openspec config path | Out-String).Trim()
$cfg = Get-Content $cfgPath -Raw | ConvertFrom-Json
$wf = @('propose','explore','new','continue','ff','apply','verify','update','sync','archive','bulk-archive','onboard')
$cfg | Add-Member -NotePropertyName workflows -NotePropertyValue $wf -Force
[IO.File]::WriteAllText($cfgPath, ($cfg | ConvertTo-Json -Depth 10), (New-Object Text.UTF8Encoding $false))

Write-Host "== 5. Зависимости проектов" -ForegroundColor Cyan
if (Get-Command npm -ErrorAction SilentlyContinue) {
    Push-Location (Join-Path $SddRoot 'sdd-frontend'); npm ci --no-audit --no-fund; npx playwright install chromium; Pop-Location
}
if (Get-Command dotnet -ErrorAction SilentlyContinue) {
    Push-Location (Join-Path $SddRoot 'sdd-backend'); dotnet restore; Pop-Location
}

Write-Host "== 6. Проверка связи с store" -ForegroundColor Cyan
foreach ($r in 'sdd-backend','sdd-frontend') { Push-Location (Join-Path $SddRoot $r); Write-Host "--- $r"; openspec doctor; Pop-Location }
if ((Test-Path (Join-Path $ext 'package.json')) -and (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "--- openspec-sdd"
    Push-Location (Join-Path $SddRoot 'sdd-specs'); node (Join-Path $ext 'bin\openspec-sdd.mjs') doctor; Pop-Location
}

if ($problems.Count) {
    Write-Host "`nНужно доустановить:" -ForegroundColor Yellow
    $problems | ForEach-Object { Write-Host "  - $_" -ForegroundColor Yellow }
    Write-Host "После установки перезапустите терминал и этот скрипт." -ForegroundColor Yellow
} else {
    Write-Host "`nВсё готово. Дальше: README.md -> 'Первые шаги'." -ForegroundColor Green
}

try { Stop-Transcript | Out-Null } catch {}
Read-Host 'Нажмите Enter, чтобы закрыть окно'
