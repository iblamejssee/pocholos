@echo off
title Pocholo's Chicken POS - Servidor
cls
echo ===================================================
echo   POCHOLO'S CHICKEN - PREPARANDO SISTEMA
echo ===================================================
echo.
echo Aplicando ultimos cambios (Construyendo aplicacion)...
echo Esto puede tomar unos minutos...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Hubo un problema al construir la aplicacion.
    echo Revisa los errores arriba.
    pause
    exit /b
)

cls
echo ===================================================
echo   SISTEMA LISTO PARA USAR
echo ===================================================
echo.
echo Para conectar celulares, tablets o impresoras:
echo 1. Asegurate que los dispositivos esten en la misma red WiFi
echo 2. Usa una de las direcciones IP que aparecen abajo
echo 3. Escribe en el navegador: TU_IP:3000
echo    Ejemplo: 192.168.1.15:3000
echo.
echo --- DIRECCIONES IP DISPONIBLES ---
ipconfig | findstr /i "IPv4"
echo ----------------------------------
echo.
echo Iniciando servidor... No cierres esta ventana.
echo.
call npm start
pause
