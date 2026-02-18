export type UserRole = 'administrador' | 'cajera' | 'mozo' | 'cocina';

export interface Usuario {
    id: string;
    nombre: string;
    email: string;
    rol: UserRole;
    activo: boolean;
    created_at: string;
}

export interface AuthUser {
    usuario: Usuario;
    token?: string;
}

// Configuración de permisos por rol
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
    administrador: ['dashboard', 'apertura', 'pos', 'mesas', 'cocina', 'ventas', 'inventario', 'reportes', 'cierre', 'gastos', 'configuracion'],
    cajera: ['dashboard', 'apertura', 'pos', 'mesas', 'cocina', 'ventas', 'inventario', 'reportes', 'cierre', 'gastos', 'configuracion'],
    mozo: ['pos', 'mesas', 'cocina'],
    cocina: ['cocina']
};

// Nombres amigables de roles
export const ROLE_NAMES: Record<UserRole, string> = {
    administrador: 'Administrador',
    cajera: 'Cajera',
    mozo: 'Mozo',
    cocina: 'Cocina'
};

// Verificar si un rol tiene permiso para acceder a una ruta
export function hasPermission(rol: UserRole, route: string): boolean {
    const permissions = ROLE_PERMISSIONS[rol];
    return permissions.includes(route);
}

// Obtener rutas permitidas para un rol
export function getAllowedRoutes(rol: UserRole): string[] {
    return ROLE_PERMISSIONS[rol];
}
