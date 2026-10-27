#!/usr/bin/env bash
# Сверка прослеживаемости: сценарии <-> тест-кейсы <-> автотесты (дополнение openspec-sdd); аргументы, например --strict, передаются как есть
cd "$(dirname "$0")/sdd-specs" && exec node ../openspec-sdd/bin/openspec-sdd.mjs trace-check "$@"
