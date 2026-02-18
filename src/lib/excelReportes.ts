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

// =========== HELPER FUNCTIONS ===========

function fillRange(ws: ExcelJS.Worksheet, r: number, c1: number, c2: number, bgColor: string) {
    for (let c = c1; c <= c2; c++) {
        ws.getCell(r, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
    }
}

function styledCell(ws: ExcelJS.Worksheet, r: number, c: number, value: string | number, opts: {
    bg?: string; font?: Partial<ExcelJS.Font>; align?: Partial<ExcelJS.Alignment>; border?: Partial<ExcelJS.Borders>;
    merge?: [number, number, number, number];
}) {
    if (opts.merge) {
        ws.mergeCells(opts.merge[0], opts.merge[1], opts.merge[2], opts.merge[3]);
    }
    const cell = ws.getCell(r, c);
    cell.value = value;
    if (opts.bg) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: opts.bg } };
    if (opts.font) cell.font = opts.font as ExcelJS.Font;
    if (opts.align) cell.alignment = opts.align as ExcelJS.Alignment;
    if (opts.border) cell.border = opts.border as ExcelJS.Borders;
}

function sectionTitle(ws: ExcelJS.Worksheet, row: number, colStart: number, colEnd: number, text: string, bgColor: string) {
    ws.mergeCells(row, colStart, row, colEnd);
    const cell = ws.getCell(row, colStart);
    cell.value = text;
    cell.font = { bold: true, size: 11, color: { argb: C.white } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
    cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    ws.getRow(row).height = 28;
}

function labelValue(ws: ExcelJS.Worksheet, row: number, colLabel: number, colLabelEnd: number, colVal: number, colValEnd: number, label: string, value: string | number, bg: string = C.white, bold: boolean = false) {
    ws.mergeCells(row, colLabel, row, colLabelEnd);
    const lc = ws.getCell(row, colLabel);
    lc.value = label;
    lc.font = { size: 10, color: { argb: C.darkGray } };
    lc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
    lc.alignment = { vertical: 'middle', indent: 1 };
    lc.border = { bottom: { style: 'hair', color: { argb: C.medGray } } };

    ws.mergeCells(row, colVal, row, colValEnd);
    const vc = ws.getCell(row, colVal);
    vc.value = value;
    vc.font = { size: 10, bold, color: { argb: bold ? C.darkRed : C.darkGray } };
    vc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
    vc.alignment = { vertical: 'middle', horizontal: 'right' };
    vc.border = { bottom: { style: 'hair', color: { argb: C.medGray } } };

    ws.getRow(row).height = 22;
}

function totalRowBlock(ws: ExcelJS.Worksheet, row: number, colStart: number, colMid: number, colEnd: number, label: string, value: string, bgColor: string, fontColor: string = C.white) {
    ws.mergeCells(row, colStart, row, colMid);
    ws.mergeCells(row, colMid + 1, row, colEnd);
    ws.getRow(row).height = 28;
    const lc = ws.getCell(row, colStart);
    lc.value = label;
    lc.font = { bold: true, size: 11, color: { argb: fontColor } };
    lc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
    lc.alignment = { vertical: 'middle', indent: 1 };

    const vc = ws.getCell(row, colMid + 1);
    vc.value = value;
    vc.font = { bold: true, size: 13, color: { argb: fontColor } };
    vc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
    vc.alignment = { vertical: 'middle', horizontal: 'right' };
}

export async function generarReporteExcelReportes(data: ReportesExportData) {
    const wb = new ExcelJS.Workbook();
    wb.creator = "Pocholo's POS";
    wb.created = new Date();

    // ==================== HOJA 1: RESUMEN (HORIZONTAL) ====================
    const ws1 = wb.addWorksheet('Resumen', {
        properties: { tabColor: { argb: C.red } },
    });
    // 12 columnas: LEFT (1-6) | GAP (7) | RIGHT (8-12)
    ws1.columns = [
        { width: 4 },   // 1
        { width: 16 },  // 2
        { width: 14 },  // 3
        { width: 14 },  // 4
        { width: 14 },  // 5
        { width: 14 },  // 6
        { width: 3 },   // 7 - gap
        { width: 4 },   // 8
        { width: 16 },  // 9
        { width: 14 },  // 10
        { width: 14 },  // 11
        { width: 14 },  // 12
    ];

    let row = 1;

    // ===== TÍTULO PRINCIPAL =====
    styledCell(ws1, row, 1, `🐔  POCHOLO'S CHICKEN — REPORTE  🐔`, {
        bg: C.red,
        font: { bold: true, size: 18, color: { argb: C.white } },
        align: { vertical: 'middle', horizontal: 'center' },
        merge: [row, 1, row, 12],
    });
    ws1.getRow(row).height = 42;
    row++;

    styledCell(ws1, row, 1, `Período: ${data.periodo}`, {
        bg: C.brown,
        font: { bold: true, size: 12, color: { argb: C.gold } },
        align: { vertical: 'middle', horizontal: 'center' },
        merge: [row, 1, row, 12],
    });
    ws1.getRow(row).height = 30;
    row++;

    ws1.getRow(row).height = 10;
    row++;

    // ===== ROW SECTION 1: MÉTRICAS (LEFT) + CUADRE DE CAJA (RIGHT) =====
    const section1Start = row;

    // LEFT: Métricas
    sectionTitle(ws1, row, 1, 6, '📊  MÉTRICAS PRINCIPALES', C.red);
    // RIGHT: Cuadre de Caja (if available)
    if (data.caja) {
        sectionTitle(ws1, row, 8, 12, '💵  CUADRE DE CAJA', C.green);
    }
    row++;

    // LEFT: Métricas data
    labelValue(ws1, row, 1, 3, 4, 6, '💰 Ingresos Totales', `S/ ${data.metricas.totalIngresos.toFixed(2)}`, C.cream, true);
    if (data.caja) {
        labelValue(ws1, row, 8, 10, 11, 12, '(+) Caja Inicial (Base)', `S/ ${data.caja.inicial.toFixed(2)}`, C.lightGreen);
    }
    row++;

    labelValue(ws1, row, 1, 3, 4, 6, '📦 Total Pedidos', `${data.metricas.cantidadPedidos}`, C.white);
    if (data.caja) {
        labelValue(ws1, row, 8, 10, 11, 12, '(+) Ventas Efectivo', `S/ ${data.caja.ventasEfectivo.toFixed(2)}`, C.white);
    }
    row++;

    labelValue(ws1, row, 1, 3, 4, 6, '🎫 Ticket Promedio', `S/ ${data.metricas.promedioPorPedido.toFixed(2)}`, C.cream);
    if (data.caja) {
        labelValue(ws1, row, 8, 10, 11, 12, '(-) Gastos Efectivo', `- S/ ${data.caja.gastosEfectivo.toFixed(2)}`, 'FFEBEE');
    }
    row++;

    labelValue(ws1, row, 1, 3, 4, 6, '🍗 Pollos Vendidos', formatearFraccionPollo(data.metricas.pollosVendidos), C.white, true);
    if (data.caja) {
        totalRowBlock(ws1, row, 8, 10, 12, '(=) EFECTIVO EN CAJA', `S/ ${data.caja.efectivoEnCaja.toFixed(2)}`, C.green);
    }
    row++;

    // Caja - Digital section
    if (data.caja) {
        // Empty left side, continue right side
        labelValue(ws1, row, 8, 10, 11, 12, '💳 Ventas Digitales', `S/ ${data.caja.ventasDigital.toFixed(2)}`, C.lightBlue);
        row++;
        labelValue(ws1, row, 8, 10, 11, 12, '(-) Gastos Digitales', `- S/ ${data.caja.gastosDigital.toFixed(2)}`, 'FFEBEE');
        row++;
        const saldoBanco = data.caja.ventasDigital - data.caja.gastosDigital;
        totalRowBlock(ws1, row, 8, 10, 12, '(=) SALDO BANCO', `S/ ${saldoBanco.toFixed(2)}`, C.blue);
        row++;
    }

    ws1.getRow(row).height = 10;
    row++;

    // ===== ROW SECTION 2: COMPARATIVA SEMANAL (FULL WIDTH) =====
    if (data.comparativa) {
        styledCell(ws1, row, 1, '📈  COMPARATIVA SEMANAL', {
            bg: C.brown,
            font: { bold: true, size: 11, color: { argb: C.white } },
            align: { vertical: 'middle', horizontal: 'left', indent: 1 },
            merge: [row, 1, row, 12],
        });
        ws1.getRow(row).height = 28;
        row++;

        // 3 columns side by side for Esta semana / Semana Anterior / Diferencia
        // Col 1-4: Esta semana
        styledCell(ws1, row, 1, 'Esta Semana', {
            bg: C.lightGreen,
            font: { size: 9, color: { argb: '666666' } },
            align: { vertical: 'middle', horizontal: 'center' },
            merge: [row, 1, row, 4],
        });
        // Col 5-8: Semana Anterior
        styledCell(ws1, row, 5, 'Semana Anterior', {
            bg: C.cream,
            font: { size: 9, color: { argb: '666666' } },
            align: { vertical: 'middle', horizontal: 'center' },
            merge: [row, 5, row, 8],
        });
        // Col 9-12: Variación
        styledCell(ws1, row, 9, 'Variación', {
            bg: data.comparativa.esPositivo ? C.lightGreen : 'FFEBEE',
            font: { size: 9, color: { argb: '666666' } },
            align: { vertical: 'middle', horizontal: 'center' },
            merge: [row, 9, row, 12],
        });
        ws1.getRow(row).height = 18;
        row++;

        // Values
        styledCell(ws1, row, 1, `S/ ${data.comparativa.semanaActual.toFixed(2)}`, {
            bg: C.lightGreen,
            font: { bold: true, size: 14, color: { argb: C.darkGray } },
            align: { vertical: 'middle', horizontal: 'center' },
            merge: [row, 1, row, 4],
        });
        styledCell(ws1, row, 5, `S/ ${data.comparativa.semanaAnterior.toFixed(2)}`, {
            bg: C.cream,
            font: { bold: true, size: 14, color: { argb: C.darkGray } },
            align: { vertical: 'middle', horizontal: 'center' },
            merge: [row, 5, row, 8],
        });
        const varText = `${data.comparativa.esPositivo ? '+' : ''}${data.comparativa.porcentajeCambio.toFixed(1)}%  (S/ ${data.comparativa.diferencia.toFixed(2)})`;
        styledCell(ws1, row, 9, varText, {
            bg: data.comparativa.esPositivo ? C.lightGreen : 'FFEBEE',
            font: { bold: true, size: 14, color: { argb: data.comparativa.esPositivo ? C.green : C.red } },
            align: { vertical: 'middle', horizontal: 'center' },
            merge: [row, 9, row, 12],
        });
        ws1.getRow(row).height = 32;
        row++;

        ws1.getRow(row).height = 10;
        row++;
    }

    // ===== ROW SECTION 3: MÉTODOS DE PAGO (LEFT) + TIPO DE VENTA + GASTOS (RIGHT) =====
    {
        const METODO_BG: Record<string, string> = {
            'Efectivo': C.lightGreen, 'Yape': C.lightPurple, 'Plin': C.lightCyan, 'Tarjeta': C.lightBlue,
        };

        // LEFT: Métodos de Pago
        sectionTitle(ws1, row, 1, 6, '💳  MÉTODOS DE PAGO', C.purple);
        // RIGHT: Tipo de Venta
        sectionTitle(ws1, row, 8, 12, '🏠  TIPO DE VENTA', C.brown);
        row++;

        const mpRows = data.desgloseMetodoPago.length;
        const dtRows = data.distribucionTipo.length;
        const maxRows = Math.max(mpRows, dtRows);

        for (let i = 0; i < maxRows; i++) {
            ws1.getRow(row).height = 22;
            // LEFT: Método de pago
            if (i < mpRows) {
                const mp = data.desgloseMetodoPago[i];
                const bg = METODO_BG[mp.metodo] || C.white;
                labelValue(ws1, row, 1, 3, 4, 6, `${mp.metodo} (${mp.porcentaje.toFixed(0)}%)`, `S/ ${mp.total.toFixed(2)}  —  ${mp.cantidad} ventas`, bg);
            }
            // RIGHT: Tipo de venta
            if (i < dtRows) {
                const dt = data.distribucionTipo[i];
                labelValue(ws1, row, 8, 10, 11, 12, `${dt.tipo} (${dt.porcentaje.toFixed(0)}%)`, `${dt.cantidad} pedidos — S/ ${dt.total.toFixed(2)}`, C.cream);
            }
            row++;
        }

        // Total of payment methods
        totalRowBlock(ws1, row, 1, 3, 6, '💰 TOTAL', `S/ ${data.metricas.totalIngresos.toFixed(2)}`, C.red);
        row++;

        ws1.getRow(row).height = 10;
        row++;
    }

    // ===== ROW SECTION 4: GASTOS (IF ANY - FULL WIDTH COMPACT) =====
    if (data.gastos.length > 0) {
        const totalGastosVal = data.gastos.reduce((s, g) => s + g.monto, 0);
        styledCell(ws1, row, 1, `📤  GASTOS DEL PERÍODO: S/ ${totalGastosVal.toFixed(2)}`, {
            bg: C.orange,
            font: { bold: true, size: 11, color: { argb: C.white } },
            align: { vertical: 'middle', horizontal: 'left', indent: 1 },
            merge: [row, 1, row, 12],
        });
        ws1.getRow(row).height = 28;
        row++;

        // Show gastos in 2 columns side by side
        const half = Math.ceil(data.gastos.length / 2);
        for (let i = 0; i < half; i++) {
            ws1.getRow(row).height = 20;
            const g1 = data.gastos[i];
            labelValue(ws1, row, 1, 4, 5, 6, `• ${g1.descripcion}`, `S/ ${g1.monto.toFixed(2)}`, i % 2 === 0 ? C.lightOrange : C.white);

            const g2Idx = i + half;
            if (g2Idx < data.gastos.length) {
                const g2 = data.gastos[g2Idx];
                labelValue(ws1, row, 8, 10, 11, 12, `• ${g2.descripcion}`, `S/ ${g2.monto.toFixed(2)}`, i % 2 === 0 ? C.lightOrange : C.white);
            }
            row++;
        }

        ws1.getRow(row).height = 10;
        row++;
    }

    // ===== ROW SECTION 5: VENTAS POR HORA (LEFT) + TOP PRODUCTOS (RIGHT) =====
    {
        const hasHoras = data.ventasPorHora.length > 0;
        const hasProducts = data.topProductos.length > 0;

        if (hasHoras || hasProducts) {
            // Headers
            if (hasHoras) {
                sectionTitle(ws1, row, 1, 6, '🕐  VENTAS POR HORA', C.blue);
            }
            if (hasProducts) {
                sectionTitle(ws1, row, 8, 12, '⭐  PRODUCTOS VENDIDOS', C.brown);
            }
            row++;

            // Sub-headers
            if (hasHoras) {
                styledCell(ws1, row, 1, 'Hora', { bg: '1565C0', font: { bold: true, size: 10, color: { argb: C.white } }, align: { vertical: 'middle', horizontal: 'center' }, merge: [row, 1, row, 2] });
                styledCell(ws1, row, 3, 'Pedidos', { bg: '1565C0', font: { bold: true, size: 10, color: { argb: C.white } }, align: { vertical: 'middle', horizontal: 'center' }, merge: [row, 3, row, 4] });
                styledCell(ws1, row, 5, 'Total S/', { bg: '1565C0', font: { bold: true, size: 10, color: { argb: C.white } }, align: { vertical: 'middle', horizontal: 'center' }, merge: [row, 5, row, 6] });
            }
            if (hasProducts) {
                styledCell(ws1, row, 8, '#', { bg: '5D4037', font: { bold: true, size: 10, color: { argb: C.white } }, align: { vertical: 'middle', horizontal: 'center' } });
                styledCell(ws1, row, 9, 'Producto', { bg: '5D4037', font: { bold: true, size: 10, color: { argb: C.white } }, align: { vertical: 'middle', indent: 1 }, merge: [row, 9, row, 10] });
                styledCell(ws1, row, 11, 'Cant.', { bg: '5D4037', font: { bold: true, size: 10, color: { argb: C.white } }, align: { vertical: 'middle', horizontal: 'center' } });
                styledCell(ws1, row, 12, 'Ingresos', { bg: '5D4037', font: { bold: true, size: 10, color: { argb: C.white } }, align: { vertical: 'middle', horizontal: 'center' } });
            }
            ws1.getRow(row).height = 24;
            row++;

            // Data rows
            const maxHoraIdx = hasHoras ? data.ventasPorHora.reduce((max, h, i, arr) => h.cantidad > arr[max].cantidad ? i : max, 0) : -1;
            const horasLen = data.ventasPorHora.length;
            // Show ALL products, not limited to 15
            const productsLen = data.topProductos.length;
            const MEDAL_BG = [C.yellow, C.lightGray, C.lightOrange];
            const maxDataRows = Math.max(horasLen, productsLen);

            for (let i = 0; i < maxDataRows; i++) {
                ws1.getRow(row).height = 20;

                // LEFT: Hora
                if (i < horasLen) {
                    const h = data.ventasPorHora[i];
                    const isPeak = i === maxHoraIdx;
                    const bg = isPeak ? C.lightOrange : (i % 2 === 0 ? C.white : C.lightBlue);

                    styledCell(ws1, row, 1, h.hora, { bg, font: { size: 10, bold: isPeak, color: { argb: C.darkGray } }, align: { vertical: 'middle', horizontal: 'center' }, merge: [row, 1, row, 2] });
                    styledCell(ws1, row, 3, h.cantidad, { bg, font: { size: 10, bold: isPeak, color: { argb: C.darkGray } }, align: { vertical: 'middle', horizontal: 'center' }, merge: [row, 3, row, 4] });
                    styledCell(ws1, row, 5, `S/ ${h.total.toFixed(2)}`, { bg, font: { size: 10, bold: isPeak, color: { argb: C.darkGray } }, align: { vertical: 'middle', horizontal: 'center' }, merge: [row, 5, row, 6] });
                }

                // RIGHT: Producto
                if (i < productsLen) {
                    const p = data.topProductos[i];
                    const bg = i < 3 ? MEDAL_BG[i] : (i % 2 === 0 ? C.white : C.lightGray);

                    styledCell(ws1, row, 8, i + 1, { bg, font: { bold: i < 3, size: 10, color: { argb: C.darkGray } }, align: { vertical: 'middle', horizontal: 'center' } });
                    styledCell(ws1, row, 9, p.nombre_producto, { bg, font: { bold: i < 3, size: 10, color: { argb: C.darkGray } }, align: { vertical: 'middle', indent: 1 }, merge: [row, 9, row, 10] });
                    // Use cantidad_total (real units) instead of veces_vendido (order count)
                    styledCell(ws1, row, 11, p.cantidad_total, { bg, font: { size: 10, bold: true, color: { argb: C.darkGray } }, align: { vertical: 'middle', horizontal: 'center' } });
                    styledCell(ws1, row, 12, `S/ ${Number(p.ingresos_total).toFixed(0)}`, { bg, font: { bold: true, size: 10, color: { argb: C.darkGray } }, align: { vertical: 'middle', horizontal: 'center' } });
                }

                row++;
            }

            ws1.getRow(row).height = 10;
            row++;
        }
    }

    // ===== ROW SECTION 6: CONSUMO DE POLLOS (FULL WIDTH, COMPACT TABLE) =====
    if (data.consumoPollos.length > 0) {
        styledCell(ws1, row, 1, '🍗  CONSUMO DE POLLOS POR DÍA', {
            bg: C.red,
            font: { bold: true, size: 11, color: { argb: C.white } },
            align: { vertical: 'middle', horizontal: 'left', indent: 1 },
            merge: [row, 1, row, 12],
        });
        ws1.getRow(row).height = 28;
        row++;

        // Show in multiple columns across the 12-col width (4 per row: Fecha-Pollos | Fecha-Pollos | Fecha-Pollos | Fecha-Pollos)
        // Each pair takes 3 cols = 12 cols / 3 per pair = 4 pairs
        const pollosPerRow = 4;
        const pollosData = data.consumoPollos;

        // Headers for each group
        for (let g = 0; g < pollosPerRow; g++) {
            const colStart = g * 3 + 1;
            styledCell(ws1, row, colStart, 'Fecha', {
                bg: C.darkRed,
                font: { bold: true, size: 9, color: { argb: C.white } },
                align: { vertical: 'middle', horizontal: 'center' },
                merge: [row, colStart, row, colStart + 1],
            });
            styledCell(ws1, row, colStart + 2, 'Pollos', {
                bg: C.darkRed,
                font: { bold: true, size: 9, color: { argb: C.white } },
                align: { vertical: 'middle', horizontal: 'center' },
            });
        }
        ws1.getRow(row).height = 22;
        row++;

        const totalPollosRows = Math.ceil(pollosData.length / pollosPerRow);
        for (let r = 0; r < totalPollosRows; r++) {
            ws1.getRow(row).height = 20;
            for (let g = 0; g < pollosPerRow; g++) {
                const idx = r * pollosPerRow + g;
                if (idx < pollosData.length) {
                    const cp = pollosData[idx];
                    const colStart = g * 3 + 1;
                    const bg = r % 2 === 0 ? C.cream : C.white;

                    styledCell(ws1, row, colStart, format(new Date(cp.fecha), 'dd/MM/yyyy'), {
                        bg,
                        font: { size: 10, color: { argb: C.darkGray } },
                        align: { vertical: 'middle', horizontal: 'center' },
                        merge: [row, colStart, row, colStart + 1],
                    });
                    styledCell(ws1, row, colStart + 2, formatearFraccionPollo(cp.pollos), {
                        bg,
                        font: { size: 10, bold: true, color: { argb: C.darkGray } },
                        align: { vertical: 'middle', horizontal: 'center' },
                    });
                }
            }
            row++;
        }

        const promedio = pollosData.reduce((s, d) => s + d.pollos, 0) / pollosData.length;
        styledCell(ws1, row, 1, `📊 Promedio Diario: ${formatearFraccionPollo(promedio)}`, {
            bg: C.orange,
            font: { bold: true, size: 11, color: { argb: C.white } },
            align: { vertical: 'middle', horizontal: 'center' },
            merge: [row, 1, row, 6],
        });
        styledCell(ws1, row, 7, `Total: ${formatearFraccionPollo(pollosData.reduce((s, d) => s + d.pollos, 0))} pollos`, {
            bg: C.orange,
            font: { bold: true, size: 11, color: { argb: C.white } },
            align: { vertical: 'middle', horizontal: 'center' },
            merge: [row, 7, row, 12],
        });
        ws1.getRow(row).height = 28;
        row++;

        ws1.getRow(row).height = 10;
        row++;
    }

    // Footer
    styledCell(ws1, row, 1, `Generado automáticamente por Pocholo's POS — ${new Date().toLocaleString('es-PE')}`, {
        font: { size: 8, italic: true, color: { argb: '999999' } },
        align: { vertical: 'middle', horizontal: 'center' },
        merge: [row, 1, row, 12],
    });

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
