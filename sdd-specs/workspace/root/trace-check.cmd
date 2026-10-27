@echo off
rem Сверка прослеживаемости: сценарии <-> тест-кейсы <-> автотесты (дополнение openspec-sdd). Аргументы, например --strict, передаются как есть.
chcp 65001 >nul
where node >nul 2>&1 || (echo Node.js not found - install: winget install OpenJS.NodeJS.LTS & pause & exit /b 1)
pushd "%~dp0sdd-specs"
node "%~dp0openspec-sdd\bin\openspec-sdd.mjs" trace-check %*
popd
echo.
pause
