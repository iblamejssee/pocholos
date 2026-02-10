@echo off
title Pocholo's Chicken POS - Servidor
echo ===================================================
echo   POCHOLO'S CHICKEN - SERVIDOR POS
echo ===================================================
echo.
echo Iniciando sistema... Por favor no cierre esta ventana.
echo.
echo Para acceder desde celulares/tablets, usa la IP de esta PC
echo seguido de :3000 (Ejemplo: 192.168.18.X:3000)
echo.
cd /d "%~dp0"
call npm start
pause
