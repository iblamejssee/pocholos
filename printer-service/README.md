# Servicio de Impresión Térmica - Pocholo's Chicken

Este script de Node.js corre en segundo plano en la computadora Windows conectada a la impresora térmica. Escucha los nuevos pedidos en tiempo real desde Supabase e imprime automáticamente un ticket de cocina.

## Requisitos Previos

1. **Node.js**: Tener instalado Node.js (v18 o superior). Descargar de [nodejs.org](https://nodejs.org/).
2. **Impresora Instalada**: La impresora térmica debe estar instalada en Windows y tener un nombre compartido o identificable.
3. **Driver**: Se recomienda usar el driver oficial de la impresora (o Generic Text/Only si falla), pero la impresora debe aparecer en "Impresoras y escáneres".

## Instalación

1. Abre una terminal (PowerShell o CMD) en esta carpeta:
   ```bash
   cd printer-service
   ```

2. Instala las dependencias:
   ```bash
   npm install
   ```

3. Configura las variables de entorno:
   - Copia el archivo de ejemplo:
     ```bash
     copy .env.example .env
     ```
   - Abre el archivo `.env` con un editor de texto (Notepad).
   - Coloca la URL y ANON KEY de tu proyecto Supabase.
   - **IMPORTANTE**: En `PRINTER_NAME`, pon el nombre EXACTO de tu impresora tal como aparece en Windows (ej. "POS-80", "EPSON TM-T20II").

## Ejecución

### Modo Prueba (para ver logs)
```bash
npm start
```
Verás mensajes indicando que se conectó a Supabase. Realiza un pedido en el sistema POS y debería imprimirse.

### Modo Producción (Segundo Plano / Inicio Automático)
Para que el script corra siempre y se reinicie solo:

1. Instala PM2 globalmente:
   ```bash
   npm install -g pm2
   ```

2. Inicia el servicio:
   ```bash
   pm2 start index.js --name "pocholos-printer"
   ```

3. Para que inicie con Windows:
   ```bash
   pm2-startup install
   pm2 save
   ```
   *(Nota: pm2-startup en Windows requiere instalar `pm2-windows-startup` o configurarlo manualmente en el programador de tareas, pero PM2 mantendrá el proceso vivo mientras la PC esté encendida).*

## Solución de Problemas

- **No imprime**: Verifica que el nombre `PRINTER_NAME` en `.env` sea idéntico al de Windows.
- **Error de conexión**: Verifica tu internet y las credenciales en `.env`.
- **Caracteres raros**: Prueba cambiar el `characterSet` en `index.js` (ej. `PC852_LATIN2` por `PC437_USA`).
