#!/usr/bin/env bash
# Сборка образов и развёртывание sdd-backend + sdd-frontend в текущий кластер kubectl.
# Linux / macOS / WSL. Для Windows — deploy.ps1 (делает то же самое).
#   ./deploy.sh [версия]     версия попадёт в APP_VERSION бэкенда (по умолчанию dev)
set -euo pipefail
VERSION="${1:-dev}"
SDD_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
NS=sdd

for c in docker kubectl; do command -v "$c" >/dev/null || { echo "Нет $c в PATH"; exit 1; }; done
CTX="$(kubectl config current-context)"
echo "== Кластер: $CTX"

LOG_DIR="$SDD_ROOT/.logs"; mkdir -p "$LOG_DIR"
# Сборка образа: полный вывод docker пишется в .logs/build-<образ>.log, при сетевом сбое - до 3 попыток.
build_image() {
  local tag="$1" path="$2" log="$LOG_DIR/build-${1%%:*}.log"
  for try in 1 2 3; do
    echo "-- $tag (попытка $try), полный вывод: $log"
    if docker build --progress=plain -t "$tag" "$path" >"$log" 2>&1; then return 0; fi
    echo "Сборка $tag не удалась"; sleep 5
  done
  tail -25 "$log"; echo "Не удалось собрать $tag - см. $log"; exit 1
}

echo "== Сборка образов"
build_image sdd-backend:dev "$SDD_ROOT/sdd-backend"
build_image sdd-frontend:dev "$SDD_ROOT/sdd-frontend"

echo "== Доставка образов в кластер"
IMAGES=(sdd-backend:dev sdd-frontend:dev)
# Узлы-контейнеры kind (в т.ч. Docker Desktop с типом кластера kind): у каждого узла свой кеш образов,
# локальные образы docker они не видят - загружаем через docker save -> docker cp -> ctr import.
KIND_NODES=()
for n in $(kubectl get nodes -o 'jsonpath={.items[*].metadata.name}'); do
  [ -n "$(docker ps -q --filter "name=^${n}$")" ] && KIND_NODES+=("$n")
done
NODES="$(kubectl get nodes -o 'jsonpath={.items[*].metadata.name}')"
if [ "$CTX" = docker-desktop ] && ((${#KIND_NODES[@]} == 0)) && [[ " $NODES " != *" docker-desktop "* ]]; then
  echo "Kubernetes в Docker Desktop работает в режиме kind, но его узлы скрыты от docker."
  echo "Включите Docker Desktop -> Settings -> Kubernetes -> 'Show system containers (advanced)' -> Apply и запустите скрипт снова."
  exit 1
fi
if [ "$CTX" = minikube ]; then
  for i in "${IMAGES[@]}"; do minikube image load "$i"; done
elif ((${#KIND_NODES[@]})); then
  echo "Узлы кластера - контейнеры kind (${KIND_NODES[*]}): загружаю образы в каждый узел"
  TMP="$(mktemp -d)"
  for i in "${IMAGES[@]}"; do
    tar="$TMP/${i//[:\/]/_}.tar"; docker save -o "$tar" "$i"
    for n in "${KIND_NODES[@]}"; do
      echo "  $i -> $n"
      docker cp "$tar" "$n:/sdd-image.tar"
      docker exec "$n" ctr -n k8s.io images import /sdd-image.tar
      docker exec "$n" rm -f /sdd-image.tar
    done
  done
  rm -rf "$TMP"
else
  case "$CTX" in
    docker-desktop|rancher-desktop|orbstack) echo "Кластер использует образы docker напрямую - загрузка не нужна" ;;
    *) echo "ВНИМАНИЕ: '$CTX' - не локальный кластер. Опубликуйте образы в реестр и задайте их через 'kustomize edit set image'." ;;
  esac
fi

echo "== Применение манифестов (namespace $NS)"
kubectl create namespace "$NS" --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -k "$SDD_ROOT/sdd-backend/deploy/k8s"
kubectl apply -k "$SDD_ROOT/sdd-frontend/deploy/k8s"
kubectl -n "$NS" set env deployment/sdd-backend APP_VERSION="$VERSION"
kubectl -n "$NS" rollout restart deployment/sdd-backend deployment/sdd-frontend
kubectl -n "$NS" rollout status deployment/sdd-backend --timeout=180s
kubectl -n "$NS" rollout status deployment/sdd-frontend --timeout=180s

cat <<MSG

Готово. Открыть приложение:
  kubectl -n $NS port-forward svc/sdd-frontend 8080:80
  http://localhost:8080
Smoke-тест против стенда (во втором терминале, из sdd-frontend):
  E2E_BASE_URL=http://localhost:8080 npm run e2e:smoke
MSG
