# Guía para Crear Usuarios en Supabase Authentication

## Paso 1: Ejecutar el Script SQL

1. Ve a tu proyecto en Supabase
2. Abre **SQL Editor**
3. Ejecuta el archivo `setup_supabase_auth.sql`
4. Esto creará la tabla `user_profiles` y las políticas necesarias

## Paso 2: Crear Usuarios desde el Dashboard

1. Ve a **Authentication** > **Users** en Supabase
2. Haz clic en **Add user** > **Create new user**
3. Crea los siguientes usuarios:

### Usuario 1: Administrador
- **Email**: `admin@pocholos.com`
- **Password**: `admin123` (o la que prefieras)
- **User Metadata** (JSON):
```json
{
  "nombre": "Administrador",
  "rol": "administrador"
}
```
- **Confirm email**: ✅ (marcar)

### Usuario 2: Cajera
- **Email**: `cajera@pocholos.com`
- **Password**: `cajera123`
- **User Metadata** (JSON):
```json
{
  "nombre": "María Cajera",
  "rol": "cajera"
}
```
- **Confirm email**: ✅

### Usuario 3: Mozo
- **Email**: `mozo@pocholos.com`
- **Password**: `mozo123`
- **User Metadata** (JSON):
```json
{
  "nombre": "Juan Mozo",
  "rol": "mozo"
}
```
- **Confirm email**: ✅

### Usuario 4: Cocina
- **Email**: `cocina@pocholos.com`
- **Password**: `cocina123`
- **User Metadata** (JSON):
```json
{
  "nombre": "Pedro Cocinero",
  "rol": "cocina"
}
```
- **Confirm email**: ✅

## Paso 3: Verificar

1. Los perfiles se crearán automáticamente en `user_profiles` gracias al trigger
2. Verifica en **SQL Editor**:
```sql
SELECT * FROM user_profiles;
```

## Notas Importantes

- ✅ **Supabase Auth** maneja automáticamente el hash de contraseñas
- ✅ Los tokens de sesión se gestionan automáticamente
- ✅ El trigger `on_auth_user_created` crea el perfil automáticamente
- ✅ Los metadatos (nombre, rol) se guardan en `user_profiles`

## Permisos por Rol

- **Administrador**: Acceso total
- **Cajera**: Apertura, POS, Cierre, Gastos
- **Mozo**: Solo POS y Cocina
- **Cocina**: Solo vista de Cocina
