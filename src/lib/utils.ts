// Función para formatear cantidades de pollos de forma legible
export function formatearCantidadPollos(cantidad: number): string {
    const entero = Math.floor(cantidad);
    const decimal = cantidad - entero;

    // Si es un número entero
    if (decimal === 0) {
        if (entero === 0) return 'Sin pollos';
        if (entero === 1) return '1 pollo';
        return `${entero} pollos`;
    }

    // Convertir decimal a fracción
    let fraccionTexto = '';

    if (Math.abs(decimal - 0.75) < 0.01) {
        fraccionTexto = 'tres cuartos';
    } else if (Math.abs(decimal - 0.5) < 0.01) {
        fraccionTexto = 'medio';
    } else if (Math.abs(decimal - 0.25) < 0.01) {
        fraccionTexto = 'un cuarto';
    } else if (Math.abs(decimal - 0.125) < 0.01) {
        fraccionTexto = 'un octavo';
    } else if (Math.abs(decimal - 0.375) < 0.01) {
        fraccionTexto = 'un cuarto y un octavo';
    } else if (Math.abs(decimal - 0.625) < 0.01) {
        fraccionTexto = 'medio y un octavo';
    } else if (Math.abs(decimal - 0.875) < 0.01) {
        fraccionTexto = 'tres cuartos y un octavo';
    } else {
        // Si no es una fracción común, mostrar con decimales
        return `${cantidad.toFixed(2)} pollos`;
    }

    // Construir el texto final
    if (entero === 0) {
        return fraccionTexto;
    } else if (entero === 1) {
        return `1 pollo y ${fraccionTexto}`;
    } else {
        return `${entero} pollos y ${fraccionTexto}`;
    }
}

// Función para formatear cantidades cortas (para UI compacta)
export function formatearCantidadPollосCorta(cantidad: number): string {
    const entero = Math.floor(cantidad);
    const decimal = cantidad - entero;

    if (decimal === 0) {
        return `${entero}`;
    }

    let fraccion = '';
    if (Math.abs(decimal - 0.75) < 0.01) fraccion = '3/4';
    else if (Math.abs(decimal - 0.5) < 0.01) fraccion = '1/2';
    else if (Math.abs(decimal - 0.25) < 0.01) fraccion = '1/4';
    else if (Math.abs(decimal - 0.125) < 0.01) fraccion = '1/8';
    else if (Math.abs(decimal - 0.375) < 0.01) fraccion = '3/8';
    else if (Math.abs(decimal - 0.625) < 0.01) fraccion = '5/8';
    else if (Math.abs(decimal - 0.875) < 0.01) fraccion = '7/8';
    else return cantidad.toFixed(2);

    if (entero === 0) return fraccion;
    return `${entero} ${fraccion}`;
}

export function descomponerStockPollos(cantidad: number) {
    const entero = Math.floor(cantidad);
    const decimal = cantidad - entero;
    let cuartosTexto = '';
    let octavosTexto = '';

    // Lógica de medios y cuartos
    if (Math.abs(decimal - 0.5) < 0.01 || Math.abs(decimal - 0.625) < 0.01) {
        cuartosTexto = 'Media';
    } else if (Math.abs(decimal - 0.25) < 0.01 || Math.abs(decimal - 0.375) < 0.01) {
        cuartosTexto = 'Un Cuarto';
    } else if (Math.abs(decimal - 0.75) < 0.01 || Math.abs(decimal - 0.875) < 0.01) {
        cuartosTexto = 'Tres Cuartos';
    }

    // Lógica de octavos (siempre es +1/8 si no es exacto cuartos/medios)
    if (
        Math.abs(decimal - 0.125) < 0.01 || // 0 + 1/8
        Math.abs(decimal - 0.375) < 0.01 || // 1/4 + 1/8
        Math.abs(decimal - 0.625) < 0.01 || // 1/2 + 1/8
        Math.abs(decimal - 0.875) < 0.01    // 3/4 + 1/8
    ) {
        octavosTexto = 'Un Octavo';
    }

    return { entero, cuartosTexto, octavosTexto };
}

// Redondea cualquier número al octavo (1/8) más cercano
export function redondearAOctavo(valor: number): number {
    return Math.round(valor * 8) / 8;
}

// Función para convertir fracción decimal a texto de fracción
export function formatearFraccionPollo(fraccion: number): string {
    // Primero redondear al octavo más cercano para corregir imprecisiones de BD
    const redondeado = redondearAOctavo(fraccion);

    if (redondeado === 0) return '0';
    if (redondeado === 1) return '1';

    // Para números mayores a 1, separar entero y fracción
    const entero = Math.floor(redondeado);
    const decimal = +(redondeado - entero).toFixed(3); // evitar errores de punto flotante

    // Mapa de fracciones conocidas
    const FRACCIONES: Record<number, string> = {
        0.125: '1/8',
        0.25: '1/4',
        0.375: '3/8',
        0.5: '1/2',
        0.625: '5/8',
        0.75: '3/4',
        0.875: '7/8',
    };

    const fraccionTexto = FRACCIONES[decimal];

    if (entero > 0 && fraccionTexto) {
        return `${entero} ${fraccionTexto}`;
    } else if (entero > 0 && decimal === 0) {
        return `${entero}`;
    } else if (fraccionTexto) {
        return fraccionTexto;
    }

    // Fallback (no debería llegar aquí después de redondear)
    return redondeado.toFixed(2);
}
