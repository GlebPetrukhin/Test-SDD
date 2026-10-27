#!/usr/bin/env bash
# Установка схем openspec-sdd без Node.js: копирует schemas/* в пользовательскую папку OpenSpec
# ($XDG_DATA_HOME/openspec/schemas или ~/.local/share/openspec/schemas). Полная версия: openspec-sdd install.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VERSION="$(sed -n 's/^  "version": "\(.*\)",$/\1/p' "$HERE/package.json")"
TARGET="${XDG_DATA_HOME:-$HOME/.local/share}/openspec/schemas"
mkdir -p "$TARGET"
for src in "$HERE"/schemas/*/; do
  name="$(basename "$src")"; rm -rf "${TARGET:?}/$name"; cp -R "$src" "$TARGET/$name"
  printf '{ "package": "openspec-sdd", "version": "%s", "installer": "install.sh" }\n' "$VERSION" > "$TARGET/$name/.openspec-sdd.json"
  echo "  схема $name -> $TARGET/$name"
done
echo "openspec-sdd $VERSION: схемы установлены в $TARGET"
