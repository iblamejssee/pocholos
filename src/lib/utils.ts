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

// Función para convertir fracción decimal a texto de fracción
export function formatearFraccionPollo(fraccion: number): string {
    if (fraccion === 0) return '0';
    if (fraccion === 1) return '1';

    // Fracciones comunes
    if (Math.abs(fraccion - 0.125) < 0.01) return '1/8';
    if (Math.abs(fraccion - 0.25) < 0.01) return '1/4';
    if (Math.abs(fraccion - 0.375) < 0.01) return '3/8';
    if (Math.abs(fraccion - 0.5) < 0.01) return '1/2';
    if (Math.abs(fraccion - 0.625) < 0.01) return '5/8';
    if (Math.abs(fraccion - 0.75) < 0.01) return '3/4';
    if (Math.abs(fraccion - 0.875) < 0.01) return '7/8';

    // Para números mayores a 1, separar entero y fracción
    const entero = Math.floor(fraccion);
    const decimal = fraccion - entero;

    if (entero > 0 && decimal > 0) {
        const fraccionParte = formatearFraccionPollo(decimal);
        return `${entero} ${fraccionParte}`;
    }

    return fraccion.toFixed(2);
}
