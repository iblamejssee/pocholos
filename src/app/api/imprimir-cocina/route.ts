
import { NextResponse } from 'next/server';
import { EscPosEncoder } from '@/lib/printer';
import net from 'net';

// CONFIGURACIÓN DE LA IMPRESORA
// Reemplazar con la IP real o usar variable de entorno
const PRINTER_IP = process.env.PRINTER_IP || '192.168.1.200';
const PRINTER_PORT = parseInt(process.env.PRINTER_PORT || '9100');

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { mesa, items, notas, id, tipo, fecha } = body;
        console.error('--- [DEBUG] INICIO DE IMPRESIÓN ---');
        console.error(`[DEBUG] IP Objetivo: ${PRINTER_IP}, Puerto: ${PRINTER_PORT}`);


        // Validar datos mínimos
        if (!items || items.length === 0) {
            return NextResponse.json({ success: false, message: 'No hay items para imprimir' }, { status: 400 });
        }

        const encoder = new EscPosEncoder();

        // 1. Inicializar
        const fechaObj = fecha ? new Date(fecha) : new Date();
        const fechaFormat = fechaObj.toLocaleString('es-PE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

        const buffer = encoder
            .initialize()
            .align('center')
            .bold(true)
            .size(1, 1)
            .text("POCHOLO'S CHICKEN")
            .newline()
            .text("COCINA")
            .newline()
            .bold(false)
            .size(0, 0)
            .text(fechaFormat)
            .newline()
            .line()
            .align('left')
            .bold(true)
            .size(1, 1)
            .text(`PEDIDO #${id?.slice(0, 8) || '???'}`)
            .newline()
            .text(tipo === 'llevar' ? 'PARA LLEVAR' : `MESA: ${mesa}`)
            .newline()
            .size(0, 0)
            .bold(false)
            .line()
            .align('left');

        // 2. Items
        items.forEach((item: any) => {
            encoder
                .bold(true)
                .size(2, 2) // TRIPLE TAMAÑO (Gigante)
                .text(`${item.cantidad}x ${item.nombre}`)
                .newline()
                .size(0, 0); // Reset

            // Detalles más grandes (Doble tamaño) para que se lean bien
            if (item.detalles?.parte || item.detalles?.trozado || item.detalles?.notas) {
                encoder.size(1, 1).bold(false);

                if (item.detalles?.parte) {
                    encoder.text(`   Parte: ${item.detalles.parte}`).newline();
                }
                if (item.detalles?.trozado) {
                    encoder.text(`   Corte: ${item.detalles.trozado}`).newline();
                }
                if (item.detalles?.notas) {
                    encoder.bold(true).text(`   NOTA: ${item.detalles.notas}`).newline();
                }
                encoder.size(0, 0); // Reset
            }
            encoder.newline();
        });

        // 3. Notas Generales
        if (notas) {
            encoder.line()
                .bold(true)
                .text('NOTAS GENERALES:')
                .newline()
                .bold(false)
                .size(1, 1)
                .text(notas)
                .size(0, 0)
                .newline();
        }

        // 4. Corte
        const data = encoder
            .line()
            .feed(4)
            .cut()
            .encode();


        // 5. Enviar a la impresora
        await new Promise<void>((resolve, reject) => {
            const client = new net.Socket();

            // Timeout de conexión 3s
            client.setTimeout(3000);

            client.connect(PRINTER_PORT, PRINTER_IP, () => {
                client.write(Buffer.from(data), (err) => {
                    if (err) {
                        client.destroy();
                        reject(err);
                    } else {
                        client.end(); // Cerrar conexión
                        resolve();
                    }
                });
            });

            client.on('error', (err) => {
                client.destroy();
                reject(err);
            });

            client.on('timeout', () => {
                client.destroy();
                reject(new Error('Tiempo de espera agotado al conectar con la impresora'));
            });
        });

        return NextResponse.json({ success: true, message: 'Impreso correctamente en cocina' });

    } catch (error: any) {
        console.error('Error de impresión (CATCH BLOCK):', error);

        let errorMessage = 'Error desconocido';
        if (error instanceof Error) {
            errorMessage = error.message;
            console.error('Stack:', error.stack);
        } else if (typeof error === 'string') {
            errorMessage = error;
        } else {
            try {
                errorMessage = JSON.stringify(error);
            } catch (e) {
                errorMessage = 'Error no serializable';
            }
        }

        return NextResponse.json({
            success: false,
            message: `Error al imprimir: ${errorMessage}. (IP: ${PRINTER_IP})`
        }, { status: 500 });
    }
}
