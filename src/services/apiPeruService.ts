export interface DocumentResponse {
    success: boolean;
    data?: {
        numero: string;
        nombre_completo: string;
        nombres?: string;
        apellido_paterno?: string;
        apellido_materno?: string;
        codigo_verificacion?: string;
        // RUC specific fields
        razon_social?: string;
        estado?: string;
        condicion?: string;
        direccion?: string;
        ubigeo?: string[];
        via_tipo?: string;
        via_nombre?: string;
        zona_codigo?: string;
        zona_tipo?: string;
        numero_direccion?: string;
        interior?: string;
        lote?: string;
        derecha?: string;
        kilometro?: string;
    };
    message?: string;
}

export const consultarDocumento = async (documento: string, tipo: 'dni' | 'ruc'): Promise<DocumentResponse> => {
    const API_TOKEN = process.env.NEXT_PUBLIC_APIPERU_TOKEN;
    const API_URL = tipo === 'dni' ? process.env.NEXT_PUBLIC_APIPERU_URL : 'https://apiperu.dev/api/ruc';

    if (!API_TOKEN || !API_URL) {
        console.error('API credentials not configured.');
        return { success: false, message: 'Configuración de API faltante' };
    }

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_TOKEN}`,
                'Accept': 'application/json'
            },
            body: JSON.stringify({ [tipo]: documento })
        });

        const data = await response.json();

        // Normalizar nombre_completo para RUC
        if (tipo === 'ruc' && data.success && data.data && !data.data.nombre_completo) {
            data.data.nombre_completo = data.data.nombre_o_razon_social || data.data.razon_social;
        }

        return data;
    } catch (error) {
        console.error(`Error in ${tipo.toUpperCase()} lookup:`, error);
        return { success: false, message: `Error de conexión con el servicio de ${tipo.toUpperCase()}` };
    }
};

// Mantener compatibilidad (opcional, mejor actualizar referencias)
export const consultarDNI = (dni: string) => consultarDocumento(dni, 'dni');
export const consultarRUC = (ruc: string) => consultarDocumento(ruc, 'ruc');
