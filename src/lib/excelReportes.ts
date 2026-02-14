'use client';

import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import type { Venta, InventarioDiario, Gasto } from './database.types';
import type { EstadisticaProducto, DesgloseMetodoPago, ConsumoPollosDia, DistribucionTipoVenta, ComparativaSemanal } from './reportes';
import { formatearFraccionPollo } from './utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const C = {
    red: 'C8102E', darkRed: '8B0000', gold: 'F2C94C', cream: 'FFF8F0',
    brown: '4A2C1A', white: 'FFFFFF', lightGray: 'F5F5F5', medGray: 'E0E0E0',
    darkGray: '333333', green: '27AE60', lightGreen: 'E8F5E9', blue: '2196F3',
    lightBlue: 'E3F2FD', orange: 'FF9800', lightOrange: 'FFF3E0', purple: '9C27B0',
    lightPurple: 'F3E5F5', yellow: 'FFF9C4', cyan: '00BCD4', lightCyan: 'E0F7FA',
};

interface ReportesExportData {
    periodo: string;
    metricas: { totalIngresos: number; cantidadPedidos: number; promedioPorPedido: number; pollosVendidos: number };
    ventas: Venta[];
    topProductos: EstadisticaProducto[];
    desgloseMetodoPago: DesgloseMetodoPago[];
    consumoPollos: ConsumoPollosDia[];
    distribucionTipo: DistribucionTipoVenta[];
    comparativa: ComparativaSemanal | null;
    ventasPorHora: { hora: string; total: number; cantidad: number }[];
    inventarios: InventarioDiario[];
    gastos: Gasto[];
    caja?: {
        inicial: number;
        ventasEfectivo: number;
        ventasDigital: number;
        gastosEfectivo: number;
        gastosDigital: number;
        efectivoEnCaja: number;
    };
}

function sectionHeader(ws: ExcelJS.Worksheet, row: number, text: string, bgColor: string, cols: number = 6) {
    ws.mergeCells(row, 1, row, cols);
    const r = ws.getRow(row);
    r.height = 30;
    const cell = ws.getCell(row, 1);
    cell.value = text;
    cell.font = { bold: true, size: 12, color: { argb: C.white } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
    cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    return row + 1;
}

function dataRow(ws: ExcelJS.Worksheet, row: number, label: string, value: string | number, bgColor: string = C.white, bold: boolean = false, cols: number = 6) {
    ws.mergeCells(row, 1, row, 3);
    ws.mergeCells(row, 4, row, cols);
    const lc = ws.getCell(row, 1);
    lc.value = label;
    lc.font = { size: 10, color: { argb: C.darkGray } };
    lc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
    lc.alignment = { vertical: 'middle', indent: 1 };
    lc.border = { bottom: { style: 'hair', color: { argb: C.medGray } } };

    const vc = ws.getCell(row, 4);
    vc.value = value;
    vc.font = { size: 10, bold, color: { argb: bold ? C.darkRed : C.darkGray } };
    vc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
    vc.alignment = { vertical: 'middle', horizontal: 'right' };
    vc.border = { bottom: { style: 'hair', color: { argb: C.medGray } } };

    ws.getRow(row).height = 22;
    return row + 1;
}

function totalRow(ws: ExcelJS.Worksheet, row: number, label: string, value: string, bgColor: string, fontColor: string = C.white, cols: number = 6) {
    ws.mergeCells(row, 1, row, 3);
    ws.mergeCells(row, 4, row, cols);
    ws.getRow(row).height = 28;
    const lc = ws.getCell(row, 1);
    lc.value = label;
    lc.font = { bold: true, size: 11, color: { argb: fontColor } };
    lc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
    lc.alignment = { vertical: 'middle', indent: 1 };

    const vc = ws.getCell(row, 4);
    vc.value = value;
    vc.font = { bold: true, size: 13, color: { argb: fontColor } };
    vc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
    vc.alignment = { vertical: 'middle', horizontal: 'right' };
    return row + 1;
}

export async function generarReporteExcelReportes(data: ReportesExportData) {
    const wb = new ExcelJS.Workbook();
    wb.creator = "Pocholo's POS";
    wb.created = new Date();

    // ==================== HOJA 1: RESUMEN ====================
    const ws1 = wb.addWorksheet('Resumen', {
        properties: { tabColor: { argb: C.red } },
    });
    ws1.columns = [{ width: 5 }, { width: 18 }, { width: 18 }, { width: 14 }, { width: 14 }, { width: 14 }];

    let row = 1;

    // Title
    ws1.mergeCells(row, 1, row, 6);
    const titleCell = ws1.getCell(row, 1);
    titleCell.value = `🐔  POCHOLO'S CHICKEN — REPORTE  🐔`;
    titleCell.font = { bold: true, size: 18, color: { argb: C.white } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.red } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    ws1.getRow(row).height = 40;
    row++;

    ws1.mergeCells(row, 1, row, 6);
    const subCell = ws1.getCell(row, 1);
    subCell.value = `Período: ${data.periodo}`;
    subCell.font = { bold: true, size: 12, color: { argb: C.gold } };
    subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.brown } };
    subCell.alignment = { vertical: 'middle', horizontal: 'center' };
    ws1.getRow(row).height = 30;
    row++;

    ws1.getRow(row).height = 8;
    row++;

    // === MÉTRICAS PRINCIPALES ===
    row = sectionHeader(ws1, row, '📊  MÉTRICAS PRINCIPALES', C.red);
    row = dataRow(ws1, row, '💰 Ingresos Totales', `S/ ${data.metricas.totalIngresos.toFixed(2)}`, C.cream, true);
    row = dataRow(ws1, row, '📦 Total Pedidos', `${data.metricas.cantidadPedidos}`, C.white);
    row = dataRow(ws1, row, '🎫 Ticket Promedio', `S/ ${data.metricas.promedioPorPedido.toFixed(2)}`, C.cream);
    row = dataRow(ws1, row, '🍗 Pollos Vendidos', formatearFraccionPollo(data.metricas.pollosVendidos), C.white, true);
    row++;

    // === CUADRE DE CAJA ===
    if (data.caja) {
        row = sectionHeader(ws1, row, '💵  CUADRE DE CAJA', C.green);
        row = dataRow(ws1, row, '(+) Caja Inicial (Base)', `S/ ${data.caja.inicial.toFixed(2)}`, C.lightGreen);
        row = dataRow(ws1, row, '(+) Ventas Efectivo', `S/ ${data.caja.ventasEfectivo.toFixed(2)}`, C.white);
        row = dataRow(ws1, row, '(-) Gastos Efectivo', `- S/ ${data.caja.gastosEfectivo.toFixed(2)}`, 'FFEBEE'); // Light Red
        row = totalRow(ws1, row, '(=) EFECTIVO EN CAJA', `S/ ${data.caja.efectivoEnCaja.toFixed(2)}`, C.green);
        row++;

        row = dataRow(ws1, row, 'Ventas Digitales', `S/ ${data.caja.ventasDigital.toFixed(2)}`, C.lightBlue);
        row = dataRow(ws1, row, 'Gastos Digitales', `- S/ ${data.caja.gastosDigital.toFixed(2)}`, 'FFEBEE');
        const saldoBanco = data.caja.ventasDigital - data.caja.gastosDigital;
        row = totalRow(ws1, row, '(=) SALDO BANCO', `S/ ${saldoBanco.toFixed(2)}`, C.blue);
        row++;
    }

    // === COMPARATIVA SEMANAL ===
    if (data.comparativa) {
        row = sectionHeader(ws1, row, '📈  COMPARATIVA SEMANAL', C.brown);
        row = dataRow(ws1, row, 'Esta Semana', `S/ ${data.comparativa.semanaActual.toFixed(2)}`, C.cream);
        row = dataRow(ws1, row, 'Semana Anterior', `S/ ${data.comparativa.semanaAnterior.toFixed(2)}`, C.white);
        row = dataRow(ws1, row, 'Diferencia', `S/ ${data.comparativa.diferencia.toFixed(2)}`, data.comparativa.esPositivo ? C.lightGreen : 'FFEBEE', true);
        row = dataRow(ws1, row, 'Variación', `${data.comparativa.esPositivo ? '+' : ''}${data.comparativa.porcentajeCambio.toFixed(1)}%`, data.comparativa.esPositivo ? C.lightGreen : 'FFEBEE', true);
        row++;
    }

    // === MÉTODOS DE PAGO ===
    row = sectionHeader(ws1, row, '💳  MÉTODOS DE PAGO', C.purple);

    const METODO_BG: Record<string, string> = {
        'Efectivo': C.lightGreen, 'Yape': C.lightPurple, 'Plin': C.lightCyan, 'Tarjeta': C.lightBlue,
    };

    for (const mp of data.desgloseMetodoPago) {
        const bg = METODO_BG[mp.metodo] || C.white;
        row = dataRow(ws1, row, `${mp.metodo} (${mp.porcentaje.toFixed(0)}%)`, `S/ ${mp.total.toFixed(2)}  —  ${mp.cantidad} ventas`, bg);
    }
    row = totalRow(ws1, row, '💰 TOTAL', `S/ ${data.metricas.totalIngresos.toFixed(2)}`, C.red);
    row++;

    // === TIPO DE VENTA ===
    if (data.distribucionTipo.length > 0) {
        row = sectionHeader(ws1, row, '🏠  DISTRIBUCIÓN: MESA vs PARA LLEVAR', C.brown);
        for (const dt of data.distribucionTipo) {
            row = dataRow(ws1, row, `${dt.tipo} (${dt.porcentaje.toFixed(0)}%)`, `${dt.cantidad} pedidos — S/ ${dt.total.toFixed(2)}`, C.cream);
        }
        row++;
    }

    // === GASTOS ===
    if (data.gastos.length > 0) {
        const totalGastosVal = data.gastos.reduce((s, g) => s + g.monto, 0);
        row = sectionHeader(ws1, row, `📤  GASTOS: S/ ${totalGastosVal.toFixed(2)}`, C.orange);
        for (const g of data.gastos) {
            row = dataRow(ws1, row, `• ${g.descripcion}`, `S/ ${g.monto.toFixed(2)}`, C.lightOrange);
        }
        row++;
    }

    // === VENTAS POR HORA ===
    if (data.ventasPorHora.length > 0) {
        row = sectionHeader(ws1, row, '🕐  VENTAS POR HORA', C.blue);

        // Table headers
        ws1.mergeCells(row, 1, row, 2);
        ws1.getCell(row, 1).value = 'Hora';
        ws1.getCell(row, 1).font = { bold: true, size: 10, color: { argb: C.white } };
        ws1.getCell(row, 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1565C0' } };
        ws1.getCell(row, 1).alignment = { vertical: 'middle', horizontal: 'center' };

        ws1.mergeCells(row, 3, row, 4);
        ws1.getCell(row, 3).value = 'Cantidad';
        ws1.getCell(row, 3).font = { bold: true, size: 10, color: { argb: C.white } };
        ws1.getCell(row, 3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1565C0' } };
        ws1.getCell(row, 3).alignment = { vertical: 'middle', horizontal: 'center' };

        ws1.mergeCells(row, 5, row, 6);
        ws1.getCell(row, 5).value = 'Total S/';
        ws1.getCell(row, 5).font = { bold: true, size: 10, color: { argb: C.white } };
        ws1.getCell(row, 5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1565C0' } };
        ws1.getCell(row, 5).alignment = { vertical: 'middle', horizontal: 'center' };
        ws1.getRow(row).height = 24;
        row++;

        const maxCantidad = Math.max(...data.ventasPorHora.map(h => h.cantidad));
        let alt = false;
        for (const h of data.ventasPorHora) {
            const bg = h.cantidad === maxCantidad ? C.lightOrange : alt ? C.lightBlue : C.white;
            ws1.mergeCells(row, 1, row, 2);
            ws1.getCell(row, 1).value = h.hora;
            ws1.getCell(row, 1).font = { size: 10, bold: h.cantidad === maxCantidad, color: { argb: C.darkGray } };
            ws1.getCell(row, 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
            ws1.getCell(row, 1).alignment = { vertical: 'middle', horizontal: 'center' };

            ws1.mergeCells(row, 3, row, 4);
            ws1.getCell(row, 3).value = h.cantidad;
            ws1.getCell(row, 3).font = { size: 10, bold: h.cantidad === maxCantidad, color: { argb: C.darkGray } };
            ws1.getCell(row, 3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
            ws1.getCell(row, 3).alignment = { vertical: 'middle', horizontal: 'center' };

            ws1.mergeCells(row, 5, row, 6);
            ws1.getCell(row, 5).value = `S/ ${h.total.toFixed(2)}`;
            ws1.getCell(row, 5).font = { size: 10, bold: h.cantidad === maxCantidad, color: { argb: C.darkGray } };
            ws1.getCell(row, 5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
            ws1.getCell(row, 5).alignment = { vertical: 'middle', horizontal: 'center' };

            ws1.getRow(row).height = 20;
            alt = !alt;
            row++;
        }
        row++;
    }

    // === CONSUMO DE POLLOS POR DÍA ===
    if (data.consumoPollos.length > 0) {
        row = sectionHeader(ws1, row, '🍗  CONSUMO DE POLLOS POR DÍA', C.red);

        ws1.mergeCells(row, 1, row, 3);
        ws1.getCell(row, 1).value = 'Fecha';
        ws1.getCell(row, 1).font = { bold: true, size: 10, color: { argb: C.white } };
        ws1.getCell(row, 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.darkRed } };
        ws1.getCell(row, 1).alignment = { vertical: 'middle', horizontal: 'center' };

        ws1.mergeCells(row, 4, row, 6);
        ws1.getCell(row, 4).value = 'Pollos';
        ws1.getCell(row, 4).font = { bold: true, size: 10, color: { argb: C.white } };
        ws1.getCell(row, 4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.darkRed } };
        ws1.getCell(row, 4).alignment = { vertical: 'middle', horizontal: 'center' };
        ws1.getRow(row).height = 24;
        row++;

        let alt = false;
        for (const cp of data.consumoPollos) {
            const bg = alt ? C.cream : C.white;
            ws1.mergeCells(row, 1, row, 3);
            ws1.getCell(row, 1).value = format(new Date(cp.fecha), 'dd/MM/yyyy');
            ws1.getCell(row, 1).font = { size: 10, color: { argb: C.darkGray } };
            ws1.getCell(row, 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
            ws1.getCell(row, 1).alignment = { vertical: 'middle', horizontal: 'center' };

            ws1.mergeCells(row, 4, row, 6);
            ws1.getCell(row, 4).value = formatearFraccionPollo(cp.pollos);
            ws1.getCell(row, 4).font = { size: 10, bold: true, color: { argb: C.darkGray } };
            ws1.getCell(row, 4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
            ws1.getCell(row, 4).alignment = { vertical: 'middle', horizontal: 'center' };

            ws1.getRow(row).height = 20;
            alt = !alt;
            row++;
        }

        const promedio = data.consumoPollos.reduce((s, d) => s + d.pollos, 0) / data.consumoPollos.length;
        row = totalRow(ws1, row, '📊 Promedio Diario', formatearFraccionPollo(promedio), C.orange, C.white);
        row++;
    }

    // === TOP PRODUCTOS ===
    if (data.topProductos.length > 0) {
        row = sectionHeader(ws1, row, '⭐  TOP PRODUCTOS MÁS VENDIDOS', C.brown);

        // Headers
        ws1.mergeCells(row, 1, row, 1);
        ws1.getCell(row, 1).value = '#';
        ws1.getCell(row, 1).font = { bold: true, size: 10, color: { argb: C.white } };
        ws1.getCell(row, 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '5D4037' } };
        ws1.getCell(row, 1).alignment = { vertical: 'middle', horizontal: 'center' };

        ws1.mergeCells(row, 2, row, 3);
        ws1.getCell(row, 2).value = 'Producto';
        ws1.getCell(row, 2).font = { bold: true, size: 10, color: { argb: C.white } };
        ws1.getCell(row, 2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '5D4037' } };
        ws1.getCell(row, 2).alignment = { vertical: 'middle', indent: 1 };

        ws1.mergeCells(row, 4, row, 4);
        ws1.getCell(row, 4).value = 'Ventas';
        ws1.getCell(row, 4).font = { bold: true, size: 10, color: { argb: C.white } };
        ws1.getCell(row, 4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '5D4037' } };
        ws1.getCell(row, 4).alignment = { vertical: 'middle', horizontal: 'center' };

        ws1.mergeCells(row, 5, row, 6);
        ws1.getCell(row, 5).value = 'Ingresos';
        ws1.getCell(row, 5).font = { bold: true, size: 10, color: { argb: C.white } };
        ws1.getCell(row, 5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '5D4037' } };
        ws1.getCell(row, 5).alignment = { vertical: 'middle', horizontal: 'center' };

        ws1.getRow(row).height = 24;
        row++;

        const MEDAL_BG = [C.yellow, C.lightGray, C.lightOrange];
        data.topProductos.slice(0, 15).forEach((p, i) => {
            const bg = i < 3 ? MEDAL_BG[i] : (i % 2 === 0 ? C.white : C.lightGray);

            ws1.getCell(row, 1).value = i + 1;
            ws1.getCell(row, 1).font = { bold: i < 3, size: 10, color: { argb: C.darkGray } };
            ws1.getCell(row, 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
            ws1.getCell(row, 1).alignment = { vertical: 'middle', horizontal: 'center' };

            ws1.mergeCells(row, 2, row, 3);
            ws1.getCell(row, 2).value = p.nombre_producto;
            ws1.getCell(row, 2).font = { bold: i < 3, size: 10, color: { argb: C.darkGray } };
            ws1.getCell(row, 2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
            ws1.getCell(row, 2).alignment = { vertical: 'middle', indent: 1 };

            ws1.getCell(row, 4).value = p.veces_vendido;
            ws1.getCell(row, 4).font = { size: 10, color: { argb: C.darkGray } };
            ws1.getCell(row, 4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
            ws1.getCell(row, 4).alignment = { vertical: 'middle', horizontal: 'center' };

            ws1.mergeCells(row, 5, row, 6);
            ws1.getCell(row, 5).value = `S/ ${Number(p.ingresos_total).toFixed(2)}`;
            ws1.getCell(row, 5).font = { bold: true, size: 10, color: { argb: C.darkGray } };
            ws1.getCell(row, 5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
            ws1.getCell(row, 5).alignment = { vertical: 'middle', horizontal: 'center' };

            ws1.getRow(row).height = 22;
            row++;
        });
        row++;
    }

    // Footer
    ws1.mergeCells(row, 1, row, 6);
    const footerCell = ws1.getCell(row, 1);
    footerCell.value = `Generado automáticamente por Pocholo's POS — ${new Date().toLocaleString('es-PE')}`;
    footerCell.font = { size: 8, italic: true, color: { argb: '999999' } };
    footerCell.alignment = { vertical: 'middle', horizontal: 'center' };

    // ==================== HOJA 2: DETALLE DE TRANSACCIONES ====================
    const ws2 = wb.addWorksheet('Transacciones', {
        properties: { tabColor: { argb: C.blue } },
    });

    ws2.columns = [
        { header: 'Fecha', width: 14 },
        { header: 'Hora', width: 10 },
        { header: 'ID Pedido', width: 14 },
        { header: 'Tipo', width: 14 },
        { header: 'Productos', width: 40 },
        { header: 'Método Pago', width: 14 },
        { header: 'Total (S/)', width: 14 },
    ];

    // Style header
    const headerRow = ws2.getRow(1);
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
        cell.font = { bold: true, size: 11, color: { argb: C.white } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.red } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = { bottom: { style: 'thin', color: { argb: C.darkRed } } };
    });

    const METODO_COLOR: Record<string, string> = {
        'efectivo': C.lightGreen, 'yape': C.lightPurple, 'plin': C.lightCyan, 'tarjeta': C.lightBlue,
    };

    data.ventas.forEach((v, i) => {
        const items = v.items.map(item => `${item.cantidad}x ${item.nombre}`).join(', ');
        let metodoPagoDisplay = (v.metodo_pago || 'efectivo').charAt(0).toUpperCase() + (v.metodo_pago || 'efectivo').slice(1);
        if (v.metodo_pago === 'mixto' && v.pago_dividido) {
            const desglose = Object.entries(v.pago_dividido)
                .filter(([, m]) => m && m > 0)
                .map(([k, m]) => `${k}: S/${m?.toFixed(2)}`)
                .join(' + ');
            metodoPagoDisplay = `Mixto (${desglose})`;
        }
        const r = ws2.addRow([
            format(new Date(v.created_at), 'dd/MM/yyyy'),
            format(new Date(v.created_at), 'HH:mm'),
            `#${v.id.slice(0, 8)}`,
            v.mesa_id ? `Mesa ${v.mesa_id}` : 'Para Llevar',
            items,
            metodoPagoDisplay,
            v.total.toFixed(2),
        ]);

        const bg = i % 2 === 0 ? C.white : C.lightGray;
        r.eachCell((cell, colNum) => {
            cell.font = { size: 10, color: { argb: C.darkGray } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
            cell.alignment = { vertical: 'middle' };
            cell.border = { bottom: { style: 'hair', color: { argb: C.medGray } } };

            if (colNum === 7) {
                cell.font = { bold: true, size: 10, color: { argb: C.darkGray } };
                cell.alignment = { vertical: 'middle', horizontal: 'right' };
                cell.numFmt = '#,##0.00';
            }
            if (colNum === 6) {
                const metodo = (v.metodo_pago || 'efectivo').toLowerCase();
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: METODO_COLOR[metodo] || bg } };
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
            }
        });
        r.height = 20;
    });

    // Total row
    if (data.ventas.length > 0) {
        const totalR = ws2.addRow(['', '', '', '', '', 'TOTAL:', data.metricas.totalIngresos.toFixed(2)]);
        totalR.height = 28;
        totalR.eachCell((cell, colNum) => {
            if (colNum >= 6) {
                cell.font = { bold: true, size: 12, color: { argb: C.white } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.red } };
                cell.alignment = { vertical: 'middle', horizontal: colNum === 7 ? 'right' : 'right' };
            }
        });
    }

    // Auto-filter
    ws2.autoFilter = { from: { row: 1, column: 1 }, to: { row: data.ventas.length + 1, column: 7 } };

    // ==================== GENERATE ====================
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const fileName = `Pocholo_Reporte_${data.periodo.replace(/[\/\s,]/g, '_')}.xlsx`;
    saveAs(blob, fileName);

    return fileName;
}
