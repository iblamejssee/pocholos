import { supabase } from './supabase';
import type { Usuario } from './roles';

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface AuthResponse {
    success: boolean;
    message: string;
    usuario?: Usuario;
}

// Login usando Supabase Auth
export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
        // Autenticar con Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: credentials.email,
            password: credentials.password,
        });

        if (authError || !authData.user) {
            return {
                success: false,
                message: 'Credenciales incorrectas'
            };
        }

        // Obtener perfil del usuario
        const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', authData.user.id)
            .single();

        if (profileError || !profile) {
            return {
                success: false,
                message: 'Error al cargar perfil de usuario'
            };
        }

        const usuario: Usuario = {
            id: profile.id,
            nombre: profile.nombre,
            email: authData.user.email || '',
            rol: profile.rol,
            activo: profile.activo,
            created_at: profile.created_at
        };

        return {
            success: true,
            message: 'Login exitoso',
            usuario
        };
    } catch (error) {
        console.error('Error en login:', error);
        return {
            success: false,
            message: 'Error al iniciar sesión'
        };
    }
}

// Obtener usuario actual de la sesión de Supabase
export async function getCurrentUser(): Promise<Usuario | null> {
    try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return null;

        const { data: profile } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (!profile) return null;

        return {
            id: profile.id,
            nombre: profile.nombre,
            email: user.email || '',
            rol: profile.rol,
            activo: profile.activo,
            created_at: profile.created_at
        };
    } catch (error) {
        console.error('Error al obtener usuario:', error);
        return null;
    }
}

// Cerrar sesión
export async function logout(): Promise<void> {
    await supabase.auth.signOut();
}

// Verificar si hay sesión activa
export async function isAuthenticated(): Promise<boolean> {
    const { data: { session } } = await supabase.auth.getSession();
    return session !== null;
}

// Guardar sesión en localStorage (Supabase lo hace automáticamente)
export function saveSession(usuario: Usuario): void {
    // Supabase Auth maneja esto automáticamente
    localStorage.setItem('pocholo_user_cache', JSON.stringify(usuario));
}

// Obtener sesión del cache local
export function getSession(): Usuario | null {
    const userStr = localStorage.getItem('pocholo_user_cache');
    if (!userStr) return null;

    try {
        return JSON.parse(userStr);
    } catch {
        return null;
    }
}
