@echo off
title Pocholos POS (Actualizado)
echo ===================================================
echo   INICIANDO POCHOLOS POS - VERSION ACTUALIZADA
echo ===================================================
echo.
echo Construyendo la aplicacion para asegurar que tengas los ultimos cambios...
echo Por favor, espera unos momentos...
echo.
call npm run build
echo.
echo ===================================================
echo   SISTEMA LISTO
echo ===================================================
echo.
echo Iniciando servidor... No cierres esta ventana.
echo.
cd /d "%~dp0"
call npm start
pause
