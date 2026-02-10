GUÍA DE INSTALACIÓN - POCHOLO'S CHICKEN POS

Para pasar el sistema a la Laptop del Restaurante, sigue estos pasos:

PASO 1: PREPARAR ESTA CARPETA
1. Cierra todas las ventanas negras (terminales) que tengas abiertas.
2. Copia toda esta carpeta "pocholos" a un USB o envíala por red a la otra laptop.
   (Nota: Si la carpeta pesa mucho, puedes borrar la carpeta "node_modules" y ".next" antes de copiar, pero entonces tendrás que hacer el PASO 3 completo).

PASO 2: EN LA LAPTOP DEL RESTAURANTE
1. Descarga e Instala "Node.js" (versión LTS) desde: https://nodejs.org/
   (Instálalo con todas las opciones por defecto, "Siguiente", "Siguiente"...).

PASO 3: CONFIGURAR (Solo si borraste node_modules o si no arranca)
1. Abre la carpeta "pocholos" en la nueva laptop.
2. Haz click derecho en un espacio vacío -> "Abrir en Terminal" (o CMD).
3. Escribe este comando y dale Enter:
   npm install
   (Espera a que termine de descargar las librerías).
4. Luego escribe este comando:
   npm run build
   (Esto preparará el sistema para ser rápido).

PASO 4: INICIAR EL SISTEMA
1. Dale doble click al archivo "start_pos.bat".
2. Se abrirá una ventana negra y luego el navegador con el sistema.
3. ¡No cierres la ventana negra!

PASO 5: CONECTAR CELULARES
1. Averigua la IP de esa laptop (Ejecuta "cmd" y escribe "ipconfig").
2. En los celulares del mozo, entra a: http://[LA_NUEVA_IP]:3000

NOTAS IMPORTANTES:
- La impresora debe estar encendida y conectada a la misma red.
- La IP de la impresora sigue siendo 192.168.18.101 (asegúrate de que el router sea el mismo).
