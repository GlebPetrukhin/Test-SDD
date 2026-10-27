#!/usr/bin/env bash
# Открывает приложение из кластера на http://localhost:8080 (kubectl port-forward). Ctrl+C — остановить.
(sleep 4; xdg-open http://localhost:8080 >/dev/null 2>&1 || open http://localhost:8080 >/dev/null 2>&1 || true) &
kubectl -n sdd port-forward svc/sdd-frontend 8080:80
