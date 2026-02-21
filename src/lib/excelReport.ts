'use client';

import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { BebidasDetalle, StockActual } from './database.types';
import { formatearCantidadPollos } from './utils';

// Color palette - Pocholo's branding
const COLORS = {
    red: 'C8102E',
    darkRed: '8B0000',
    gold: 'F2C94C',
    cream: 'FFF8F0',
    brown: '4A2C1A',
    white: 'FFFFFF',
    lightGray: 'F5F5F5',
    medGray: 'E0E0E0',
    darkGray: '333333',
    green: '27AE60',
    lightGreen: 'E8F5E9',
    blue: '2196F3',
    lightBlue: 'E3F2FD',
    orange: 'FF9800',
    lightOrange: 'FFF3E0',
    purple: '9C27B0',
    lightPurple: 'F3E5F5',
    yellow: 'FFF9C4',
};

const MARCA_LABEL: Record<string, string> = {
    inca_kola: 'Inca Kola',
    coca_cola: 'Coca Cola',
    sprite: 'Sprite',
    fanta: 'Fanta',
    agua_mineral: 'Agua Mineral',
};

const TIPO_LABEL: Record<string, string> = {
    personal_retornable: 'Personal Ret.',
    descartable: 'Descartable',
    gordita: 'Gordita',
    litro: '1L',
    litro_medio: '1.5L',
    tres_litros: '3L',
    mediana: '2.25L',
    personal: '600ml',
    grande: '2.5L',
};

interface ReportData {
    fecha: string;
    stock: StockActual;
    metricas: { totalIngresos: number; pollosVendidos: number };
    ventasPorMetodo: Record<string, number>;
    desglosePollos: { enteros: number; medios: number; cuartos: number; octavos: number; mostritos: number };
    listaPlatosVendidos: { nombre: string; cantidad: number }[];
    gastosDelDia: { descripcion: string; monto: number; metodo_pago?: string }[];
    totalGastos: number;
    stockPollosReal: string;
    pollosAderezados: string;
    pollosEnCaja: string;
    cenaPersonal: string;
    pollosGolpeados: string;
    stockGaseosasReal: string;
    stockPapasFinal: string;
    dineroCajaReal: string;
    observaciones: string;
    diffPollos: number;
    diffGaseosas: number;
}

function applyHeaderStyle(row: ExcelJS.Row, bgColor: string, fontColor: string = COLORS.white) {
    row.height = 28;
    row.eachCell((cell) => {
        cell.font = { bold: true, size: 13, color: { argb: fontColor } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
            bottom: { style: 'thin', color: { argb: COLORS.medGray } },
        };
    });
}

function applySectionHeader(ws: ExcelJS.Worksheet, row: number, text: string, bgColor: string, cols: number = 4) {
    ws.mergeCells(row, 1, row, cols);
    const r = ws.getRow(row);
    r.height = 30;
    const cell = ws.getCell(row, 1);
    cell.value = text;
    cell.font = { bold: true, size: 12, color: { argb: COLORS.white } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
    cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    cell.border = {
        bottom: { style: 'thin', color: { argb: bgColor } },
    };
    return row + 1;
}

function addDataRow(ws: ExcelJS.Worksheet, row: number, label: string, value: string | number, bgColor: string = COLORS.white, boldValue: boolean = false, cols: number = 4) {
    ws.mergeCells(row, 1, row, 2);
    ws.mergeCells(row, 3, row, cols);
    const labelCell = ws.getCell(row, 1);
    labelCell.value = label;
    labelCell.font = { size: 10, color: { argb: COLORS.darkGray } };
    labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
    labelCell.alignment = { vertical: 'middle', indent: 1 };
    labelCell.border = {
        bottom: { style: 'hair', color: { argb: COLORS.medGray } },
    };

    const valCell = ws.getCell(row, 3);
    valCell.value = value;
    valCell.font = { size: 10, bold: boldValue, color: { argb: boldValue ? COLORS.darkRed : COLORS.darkGray } };
    valCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
    valCell.alignment = { vertical: 'middle', horizontal: 'right' };
    valCell.border = {
        bottom: { style: 'hair', color: { argb: COLORS.medGray } },
    };

    ws.getRow(row).height = 22;
    return row + 1;
}

function addTotalRow(ws: ExcelJS.Worksheet, row: number, label: string, value: string, bgColor: string, fontColor: string = COLORS.white, cols: number = 4) {
    ws.mergeCells(row, 1, row, 2);
    ws.mergeCells(row, 3, row, cols);
    const r = ws.getRow(row);
    r.height = 28;

    const labelCell = ws.getCell(row, 1);
    labelCell.value = label;
    labelCell.font = { bold: true, size: 11, color: { argb: fontColor } };
    labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
    labelCell.alignment = { vertical: 'middle', indent: 1 };

    const valCell = ws.getCell(row, 3);
    valCell.value = value;
    valCell.font = { bold: true, size: 13, color: { argb: fontColor } };
    valCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
    valCell.alignment = { vertical: 'middle', horizontal: 'right' };

    return row + 1;
}

export async function generarReporteExcel(data: ReportData) {
    const wb = new ExcelJS.Workbook();
    wb.creator = "Pocholo's POS";
    wb.created = new Date();

    // ==================== HOJA 1: RESUMEN GENERAL ====================
    const ws = wb.addWorksheet('Resumen del Día', {
        properties: { tabColor: { argb: COLORS.red } },
    });

    // Column widths
    ws.columns = [
        { width: 5 },
        { width: 25 },
        { width: 20 },
        { width: 20 },
    ];

    let row = 1;

    // === TÍTULO PRINCIPAL ===
    ws.mergeCells(row, 1, row, 4);
    const titleCell = ws.getCell(row, 1);
    titleCell.value = `🐔  POCHOLO'S CHICKEN  🐔`;
    titleCell.font = { bold: true, size: 18, color: { argb: COLORS.white } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.red } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    ws.getRow(row).height = 40;
    row++;

    ws.mergeCells(row, 1, row, 4);
    const subtitleCell = ws.getCell(row, 1);
    subtitleCell.value = `Reporte de Cierre — ${data.fecha}`;
    subtitleCell.font = { bold: true, size: 12, color: { argb: COLORS.gold } };
    subtitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.brown } };
    subtitleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    ws.getRow(row).height = 30;
    row++;

    // Empty spacer row
    ws.getRow(row).height = 8;
    row++;

    // === VENTAS POR MÉTODO DE PAGO ===
    row = applySectionHeader(ws, row, '💰  VENTAS POR MÉTODO DE PAGO', COLORS.red);

    row = addDataRow(ws, row, '💵 Efectivo', `S/ ${(data.ventasPorMetodo['efectivo'] || 0).toFixed(2)}`, COLORS.cream);
    row = addDataRow(ws, row, '💳 Tarjeta', `S/ ${(data.ventasPorMetodo['tarjeta'] || 0).toFixed(2)}`, COLORS.white);
    row = addDataRow(ws, row, '📱 Yape', `S/ ${(data.ventasPorMetodo['yape'] || 0).toFixed(2)}`, COLORS.lightPurple);
    row = addDataRow(ws, row, '💠 Plin', `S/ ${(data.ventasPorMetodo['plin'] || 0).toFixed(2)}`, COLORS.lightBlue);
    row = addTotalRow(ws, row, '💰 TOTAL VENTAS', `S/ ${data.metricas.totalIngresos.toFixed(2)}`, COLORS.red);

    row++; // spacer

    // === CUADRE DE CAJA ===
    row = applySectionHeader(ws, row, '🫰  CUADRE DE CAJA (EFECTIVO)', COLORS.brown);

    const baseInicial = data.stock?.dinero_inicial || 0;
    const ventasEfectivo = data.ventasPorMetodo['efectivo'] || 0;
    const totalEfectivoEsperado = ventasEfectivo + baseInicial - data.totalGastos;

    row = addDataRow(ws, row, 'Base Inicial (Caja Chica)', `S/ ${baseInicial.toFixed(2)}`, COLORS.cream);
    row = addDataRow(ws, row, 'Ventas en Efectivo', `S/ ${ventasEfectivo.toFixed(2)}`, COLORS.white);
    row = addDataRow(ws, row, 'Total Efectivo Esperado', `S/ ${totalEfectivoEsperado.toFixed(2)}`, COLORS.cream, true);
    row = addDataRow(ws, row, 'Dinero Físico Contado', `S/ ${parseFloat(data.dineroCajaReal || '0').toFixed(2)}`, COLORS.white);

    const diffDinero = parseFloat(data.dineroCajaReal || '0') - totalEfectivoEsperado;
    const diffColor = diffDinero === 0 ? COLORS.lightGreen : diffDinero > 0 ? COLORS.lightGreen : 'FFEBEE';
    row = addDataRow(ws, row, 'Diferencia', `S/ ${diffDinero.toFixed(2)}`, diffColor, true);

    row++; // spacer

    // === GASTOS DEL DÍA ===
    row = applySectionHeader(ws, row, `📤  GASTOS DEL DÍA: S/ ${data.totalGastos.toFixed(2)}`, COLORS.orange);

    if (data.gastosDelDia.length > 0) {
        for (const g of data.gastosDelDia) {
            row = addDataRow(ws, row, `• ${g.descripcion}`, `S/ ${g.monto.toFixed(2)}`, COLORS.lightOrange);
        }
    } else {
        row = addDataRow(ws, row, 'No hubo gastos registrados', '', COLORS.lightOrange);
    }

    const efectivoNeto = totalEfectivoEsperado - data.totalGastos;
    row = addTotalRow(ws, row, '💵 EFECTIVO NETO', `S/ ${efectivoNeto.toFixed(2)}`, COLORS.green);

    row++; // spacer

    // === DESGLOSE DE POLLOS ===
    row = applySectionHeader(ws, row, '🍗  DESGLOSE DE POLLOS', COLORS.red);

    row = addDataRow(ws, row, '🐣 Pollos Iniciales', `${data.stock?.pollos_iniciales || 0}`, COLORS.cream);
    row = addDataRow(ws, row, '✅ Vendidos (Total)', formatearCantidadPollos(data.metricas.pollosVendidos), COLORS.lightGreen);
    row = addDataRow(ws, row, '   — Enteros', `${data.desglosePollos.enteros}`, COLORS.white);
    row = addDataRow(ws, row, '   — Medios', `${data.desglosePollos.medios}`, COLORS.white);
    row = addDataRow(ws, row, '   — Cuartos', `${data.desglosePollos.cuartos}`, COLORS.white);
    row = addDataRow(ws, row, '   — Octavos', `${data.desglosePollos.octavos}`, COLORS.white);
    row = addDataRow(ws, row, '   — Mostritos', `${data.desglosePollos.mostritos}`, COLORS.white);
    row = addDataRow(ws, row, '❌ Sobrantes Total', data.stockPollosReal, COLORS.cream, true);
    row = addDataRow(ws, row, '   🍗 Aderezados', data.pollosAderezados || '0', COLORS.white);
    row = addDataRow(ws, row, '   📦 En Caja', data.pollosEnCaja || '0', COLORS.white);
    row = addDataRow(ws, row, '🍽️ Cena del Personal', data.cenaPersonal || '0', COLORS.lightGreen);
    row = addDataRow(ws, row, '💥 Pollos Golpeados', data.pollosGolpeados || '0', 'FFEBEE');

    const pollosFinalesNetos = parseFloat(data.stockPollosReal || '0') - parseFloat(data.cenaPersonal || '0') - parseFloat(data.pollosGolpeados || '0');
    row = addTotalRow(ws, row, '📊 POLLOS FINALES NETOS', `${pollosFinalesNetos.toFixed(2)}`, COLORS.green);

    const diffPollosColor = data.diffPollos === 0 ? COLORS.lightGreen : 'FFEBEE';
    row = addDataRow(ws, row, 'Diferencia vs Sistema', `${data.diffPollos > 0 ? '+' : ''}${data.diffPollos}`, diffPollosColor, true);

    row++; // spacer

    // === INVENTARIO PAPAS ===
    row = applySectionHeader(ws, row, '🥔  INVENTARIO PAPAS', COLORS.orange);

    row = addDataRow(ws, row, 'Papas Iniciales', `${data.stock?.papas_iniciales || 0} Kg`, COLORS.lightOrange);
    row = addDataRow(ws, row, 'Papas Finales', `${data.stockPapasFinal || 0} Kg`, COLORS.lightOrange);
    const consumoPapas = (data.stock?.papas_iniciales || 0) - (parseFloat(data.stockPapasFinal) || 0);
    row = addDataRow(ws, row, 'Consumo Aprox.', `${consumoPapas.toFixed(1)} Kg`, COLORS.lightOrange, true);

    row++; // spacer

    // === BEBIDAS SOBRANTES ===
    row = applySectionHeader(ws, row, '🥤  BEBIDAS SOBRANTES (para mañana)', COLORS.blue);

    if (data.stock?.bebidas_detalle) {
        const MARCA_COLORS: Record<string, string> = {
            inca_kola: COLORS.yellow,
            coca_cola: 'FFEBEE',
            sprite: COLORS.lightGreen,
            fanta: COLORS.lightOrange,
            agua_mineral: COLORS.lightBlue,
        };

        for (const [marca, tipos] of Object.entries(data.stock.bebidas_detalle)) {
            const tiposObj = tipos as Record<string, number>;
            const items = Object.entries(tiposObj);
            const total = Object.values(tiposObj).reduce((s, n) => s + n, 0);
            const bgColor = MARCA_COLORS[marca] || COLORS.lightGray;

            // Brand header
            ws.mergeCells(row, 1, row, 4);
            const brandCell = ws.getCell(row, 1);
            brandCell.value = `  ${MARCA_LABEL[marca] || marca}  (Total: ${total})`;
            brandCell.font = { bold: true, size: 10, color: { argb: COLORS.darkGray } };
            brandCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
            brandCell.alignment = { vertical: 'middle', indent: 1 };
            brandCell.border = { bottom: { style: 'thin', color: { argb: COLORS.medGray } } };
            ws.getRow(row).height = 24;
            row++;

            for (const [tipo, qty] of items) {
                row = addDataRow(ws, row, `    ${TIPO_LABEL[tipo] || tipo}`, `${qty}`, COLORS.white);
            }
        }
    }

    row++; // spacer

    // === PLATILLOS VENDIDOS ===
    row = applySectionHeader(ws, row, '📋  PLATILLOS VENDIDOS', COLORS.purple);

    if (data.listaPlatosVendidos.length > 0) {
        // Header
        ws.mergeCells(row, 1, row, 2);
        ws.getCell(row, 1).value = 'Platillo';
        ws.getCell(row, 1).font = { bold: true, size: 10, color: { argb: COLORS.white } };
        ws.getCell(row, 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '7B1FA2' } };
        ws.getCell(row, 1).alignment = { vertical: 'middle', indent: 1 };

        ws.mergeCells(row, 3, row, 4);
        ws.getCell(row, 3).value = 'Cantidad';
        ws.getCell(row, 3).font = { bold: true, size: 10, color: { argb: COLORS.white } };
        ws.getCell(row, 3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '7B1FA2' } };
        ws.getCell(row, 3).alignment = { vertical: 'middle', horizontal: 'center' };
        ws.getRow(row).height = 24;
        row++;

        let alternate = false;
        for (const plato of data.listaPlatosVendidos) {
            const bg = alternate ? COLORS.lightPurple : COLORS.white;
            row = addDataRow(ws, row, plato.nombre, `x${plato.cantidad}`, bg);
            alternate = !alternate;
        }
    } else {
        row = addDataRow(ws, row, 'No se vendieron platillos hoy', '', COLORS.lightPurple);
    }

    row++; // spacer

    // === OBSERVACIONES ===
    row = applySectionHeader(ws, row, '📝  OBSERVACIONES', COLORS.darkGray);
    ws.mergeCells(row, 1, row, 4);
    const obsCell = ws.getCell(row, 1);
    obsCell.value = data.observaciones || 'Ninguna';
    obsCell.font = { size: 10, italic: true, color: { argb: COLORS.darkGray } };
    obsCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.lightGray } };
    obsCell.alignment = { vertical: 'middle', indent: 1, wrapText: true };
    ws.getRow(row).height = 30;
    row++;

    // Footer
    row++;
    ws.mergeCells(row, 1, row, 4);
    const footerCell = ws.getCell(row, 1);
    footerCell.value = `Generado automáticamente por Pocholo's POS — ${new Date().toLocaleString('es-PE')}`;
    footerCell.font = { size: 8, italic: true, color: { argb: '999999' } };
    footerCell.alignment = { vertical: 'middle', horizontal: 'center' };

    // === GENERAR Y DESCARGAR ===
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const fileName = `Pocholo_Reporte_${data.fecha.replace(/\//g, '-')}.xlsx`;
    saveAs(blob, fileName);

    return fileName;
}
