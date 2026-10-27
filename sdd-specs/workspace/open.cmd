@echo off
rem Opens the SDD app from the Kubernetes cluster at http://localhost:8080 (kubectl port-forward).
rem Keep this window open while you use the app; close it to stop.
start "" cmd /c "timeout /t 4 >nul & start http://localhost:8080"
echo Port-forward sdd-frontend -> http://localhost:8080  (close this window to stop)
kubectl -n sdd port-forward svc/sdd-frontend 8080:80
echo.
echo port-forward stopped, exit code %ERRORLEVEL%
pause
