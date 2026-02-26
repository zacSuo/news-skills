@echo off
cd /d "%~dp0.."
REM 使用 node 直接运行，避免任务计划程序环境下 npm 不在 PATH 中
node scripts\weekly-report.js --send
if errorlevel 1 pause
