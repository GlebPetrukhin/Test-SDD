#!/usr/bin/env bash
# Первичная настройка рабочего места SDD на Linux / macOS / WSL.
set -uo pipefail
SDD_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
export OPENSPEC_TELEMETRY=0
problems=()
need() { command -v "$1" >/dev/null 2>&1 || { problems+=("$1 не найден - $2"); return 1; }; }

echo "== 0. Файлы в корне SDD (README, запускалки, SDD.code-workspace)"
for f in "$(dirname "${BASH_SOURCE[0]}")"/root/*; do cp -f "$f" "$SDD_ROOT/"; echo "  $(basename "$f")"; done
chmod +x "$SDD_ROOT"/*.sh 2>/dev/null

echo "== 1. Проверка инструментов"
need git "пакетный менеджер ОС"
if need node "https://nodejs.org (нужен 22.22.3+ или 24.15+)"; then
  node -e 'const [a,b,c]=process.versions.node.split(".").map(Number);const ok=(a===22&&(b>22||(b===22&&c>=3)))||(a===24&&b>=15)||a>=26;process.exit(ok?0:1)' \
    || problems+=("Node.js $(node -v) не подходит Angular 22 - нужен 22.22.3+ или 24.15+")
fi
if need dotnet "https://learn.microsoft.com/dotnet/core/install/linux (SDK 10)"; then
  dotnet --list-sdks | grep -q '^10\.' || problems+=(".NET SDK 10 не установлен")
fi
need docker "Docker Engine / Docker Desktop / Rancher Desktop"
need kubectl "https://kubernetes.io/docs/tasks/tools/ (+ kind, minikube или k3d для локального кластера)"

echo "== 2. OpenSpec CLI"
if ! command -v openspec >/dev/null; then
  if command -v npm >/dev/null; then npm install -g @fission-ai/openspec@latest
  else curl -fsSL https://raw.githubusercontent.com/Fission-AI/OpenSpec/main/scripts/binary/install.sh | sh; fi
fi
openspec --version

echo "== 2b. Дополнение openspec-sdd (схема процесса sdd поверх стандартного OpenSpec)"
EXT="$SDD_ROOT/openspec-sdd"
if [ ! -f "$EXT/package.json" ]; then
  problems+=("нет папки openspec-sdd в $SDD_ROOT - склонируйте репозиторий openspec-sdd рядом с sdd-specs и запустите setup снова")
elif command -v node >/dev/null; then
  npm install -g "$EXT" --no-audit --no-fund >/dev/null && node "$EXT/bin/openspec-sdd.mjs" install
else
  "$EXT/install.sh"; problems+=("команды openspec-sdd (trace-check, merge-test-cases) требуют Node.js - схема sdd установлена без них")
fi

echo "== 3. Регистрация store sdd-specs"
if openspec store list --json | grep -q '"id": "sdd-specs"'; then echo "Уже зарегистрирован"
else openspec store register "$SDD_ROOT/sdd-specs"; fi

echo "== 4. Расширенный набор команд OpenSpec"
openspec config set profile custom >/dev/null
openspec config set workflows '["propose","explore","new","continue","ff","apply","verify","update","sync","archive","bulk-archive","onboard"]' >/dev/null

echo "== 5. Зависимости проектов"
command -v npm >/dev/null && (cd "$SDD_ROOT/sdd-frontend" && npm ci --no-audit --no-fund && npx playwright install chromium)
command -v dotnet >/dev/null && (cd "$SDD_ROOT/sdd-backend" && dotnet restore)

echo "== 6. Проверка связи с store"
for r in sdd-backend sdd-frontend; do echo "--- $r"; (cd "$SDD_ROOT/$r" && openspec doctor); done
[ -f "$EXT/package.json" ] && command -v node >/dev/null && { echo "--- openspec-sdd"; (cd "$SDD_ROOT/sdd-specs" && node "$EXT/bin/openspec-sdd.mjs" doctor); }

if ((${#problems[@]})); then
  echo; echo "Нужно доустановить:"; printf '  - %s\n' "${problems[@]}"
else
  echo; echo "Всё готово. Дальше: README.md -> 'Первые шаги'."
fi
