# Сборка образов и развёртывание sdd-backend + sdd-frontend в текущий кластер kubectl.
# Windows (PowerShell 5.1 / 7). Для Linux/macOS — deploy.sh (делает то же самое).
#   .\deploy.ps1 [-Version 0.1.0]    версия попадёт в APP_VERSION бэкенда (по умолчанию dev)
param([string]$Version = 'dev')
$ErrorActionPreference = 'Stop'
$SddRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$LogDir = Join-Path $SddRoot '.logs'
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
Start-Transcript -Path (Join-Path $LogDir "deploy-$(Get-Date -Format 'yyyyMMdd-HHmmss').log") | Out-Null
Write-Host "Лог: $LogDir"
trap { Write-Host "ОШИБКА: $_" -ForegroundColor Red; try { Stop-Transcript | Out-Null } catch {}; Read-Host 'Нажмите Enter, чтобы закрыть окно'; exit 1 }
$Ns = 'sdd'

function Invoke-Native { param([string]$Exe, [string[]]$Args_)
    & $Exe @Args_
    if ($LASTEXITCODE -ne 0) { throw "$Exe $($Args_ -join ' ') завершился с кодом $LASTEXITCODE" }
}

foreach ($c in 'docker','kubectl') { if (-not (Get-Command $c -ErrorAction SilentlyContinue)) { throw "Нет $c в PATH" } }
$ctx = (kubectl config current-context).Trim()
Write-Host "== Кластер: $ctx" -ForegroundColor Cyan

# Сборка образа: полный вывод docker пишется в .logs\build-<образ>.log, при сетевом сбое - до 3 попыток.
function Build-Image([string]$Tag, [string]$Path) {
    $name = ($Tag -split ':')[0]
    $buildLog = Join-Path $LogDir "build-$name.log"
    for ($try = 1; $try -le 3; $try++) {
        Write-Host "-- $Tag (попытка $try), полный вывод: $buildLog"
        # cmd /c объединяет stderr docker со stdout, иначе PowerShell 5.1 считает прогресс сборки ошибкой
        cmd /c "docker build --progress=plain -t $Tag `"$Path`" 2>&1" | Tee-Object -FilePath $buildLog | Select-String -Pattern '^#\d+ (DONE|ERROR|CACHED)|ERROR|error' | ForEach-Object { $_.Line }
        if ($LASTEXITCODE -eq 0) { return }
        Write-Warning "Сборка $Tag не удалась (код $LASTEXITCODE)"
        if ($try -lt 3) { Start-Sleep -Seconds 5 }
    }
    Get-Content $buildLog -Tail 25 | ForEach-Object { Write-Host $_ }
    throw "Не удалось собрать $Tag - см. $buildLog"
}

Write-Host "== Сборка образов" -ForegroundColor Cyan
Build-Image 'sdd-backend:dev' (Join-Path $SddRoot 'sdd-backend')
Build-Image 'sdd-frontend:dev' (Join-Path $SddRoot 'sdd-frontend')

Write-Host "== Доставка образов в кластер" -ForegroundColor Cyan
$images = @('sdd-backend:dev','sdd-frontend:dev')

# Узлы-контейнеры kind (в т.ч. Docker Desktop с типом кластера kind): у каждого узла свой кеш образов,
# локальные образы docker они не видят - загружаем через docker save -> docker cp -> ctr import.
function Import-ToKindNodes([string[]]$Nodes) {
    $tmp = Join-Path ([IO.Path]::GetTempPath()) 'sdd-images'
    New-Item -ItemType Directory -Force -Path $tmp | Out-Null
    foreach ($i in $images) {
        $tar = Join-Path $tmp (($i -replace '[:/]','_') + '.tar')
        Invoke-Native docker @('save','-o',$tar,$i)
        foreach ($n in $Nodes) {
            Write-Host "  $i -> $n"
            Invoke-Native docker @('cp',$tar,"${n}:/sdd-image.tar")
            Invoke-Native docker @('exec',$n,'ctr','-n','k8s.io','images','import','/sdd-image.tar')
            Invoke-Native docker @('exec',$n,'rm','-f','/sdd-image.tar')
        }
        Remove-Item $tar -Force
    }
}

$nodeNames = @(kubectl get nodes -o 'jsonpath={.items[*].metadata.name}') -split '\s+' | Where-Object { $_ }
$kindNodes = @($nodeNames | Where-Object { docker ps -q --filter "name=^$_$" })
if ($ctx -eq 'docker-desktop' -and $kindNodes.Count -eq 0 -and -not ($nodeNames -contains 'docker-desktop')) {
    throw "Kubernetes в Docker Desktop работает в режиме kind, но его узлы скрыты от docker. Включите Docker Desktop -> Settings -> Kubernetes -> 'Show system containers (advanced)' -> Apply и запустите скрипт снова."
}

if ($ctx -eq 'minikube') {
    foreach ($i in $images) { Invoke-Native minikube @('image','load',$i) }
} elseif ($kindNodes.Count -gt 0) {
    Write-Host "Узлы кластера - контейнеры kind ($($kindNodes -join ', ')): загружаю образы в каждый узел"
    Import-ToKindNodes $kindNodes
} elseif (@('docker-desktop','rancher-desktop','orbstack') -contains $ctx) {
    Write-Host "Кластер использует образы docker напрямую - загрузка не нужна"
} else {
    Write-Warning "'$ctx' - не локальный кластер. Опубликуйте образы в реестр и задайте их через 'kustomize edit set image'."
}

Write-Host "== Применение манифестов (namespace $Ns)" -ForegroundColor Cyan
kubectl create namespace $Ns --dry-run=client -o yaml | kubectl apply -f -
Invoke-Native kubectl @('apply','-k',(Join-Path $SddRoot 'sdd-backend\deploy\k8s'))
Invoke-Native kubectl @('apply','-k',(Join-Path $SddRoot 'sdd-frontend\deploy\k8s'))
Invoke-Native kubectl @('-n',$Ns,'set','env','deployment/sdd-backend',"APP_VERSION=$Version")
Invoke-Native kubectl @('-n',$Ns,'rollout','restart','deployment/sdd-backend','deployment/sdd-frontend')
Invoke-Native kubectl @('-n',$Ns,'rollout','status','deployment/sdd-backend','--timeout=180s')
Invoke-Native kubectl @('-n',$Ns,'rollout','status','deployment/sdd-frontend','--timeout=180s')

Write-Host @"

Готово. Открыть приложение:
  kubectl -n $Ns port-forward svc/sdd-frontend 8080:80
  http://localhost:8080
Smoke-тест против стенда (во втором терминале, из sdd-frontend):
  `$env:E2E_BASE_URL='http://localhost:8080'; npm run e2e:smoke
"@ -ForegroundColor Green

try { Stop-Transcript | Out-Null } catch {}
Read-Host 'Нажмите Enter, чтобы закрыть окно'
