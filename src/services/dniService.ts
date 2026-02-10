const API_TOKEN = process.env.NEXT_PUBLIC_APIPERU_TOKEN;
const API_URL = process.env.NEXT_PUBLIC_APIPERU_URL;

export interface DNIResponse {
    success: boolean;
    data?: {
        numero: string;
        nombre_completo: string;
        nombres: string;
        apellido_paterno: string;
        apellido_materno: string;
        codigo_verificacion: string;
    };
    message?: string;
}

export const consultarDNI = async (dni: string): Promise<DNIResponse> => {
    if (!API_TOKEN || !API_URL) {
        console.error('DNI API credentials not configured');
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
            body: JSON.stringify({ dni })
        });

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error in DNI lookup:', error);
        return { success: false, message: 'Error de conexión con el servicio de DNI' };
    }
};