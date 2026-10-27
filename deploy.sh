#!/usr/bin/env bash
# Обёртка: основной скрипт версионируется в sdd-specs/workspace/deploy.sh
exec "$(dirname "$0")/sdd-specs/workspace/deploy.sh" "$@"
