@echo off
chcp 65001 >nul 2>&1
title 诸神愚戏 · 信仰游戏
cd /d "D:\诸神愚戏"

echo ========================================
echo   诸神愚戏 · 信仰游戏
echo ========================================
echo.
echo  正在启动服务...
echo  管理员账号: 管理员
echo  管理员密码: xxxxxxx
echo.
echo  服务地址: http://localhost:3000
echo  按 Ctrl+C 停止服务
echo ========================================
echo.

start "" http://localhost:3000
node server.js

echo.
echo 服务已停止。
pause
