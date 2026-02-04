# 📖 Documentación Oficial - Pocholo's Chicken POS

Sistema de gestión integral para pollerías desarrollado para digitalizar las operaciones de venta, gastos e inventario.

---

## 1. Introducción

**Pocholo's Chicken POS** es una aplicación web moderna diseñada para gestionar las operaciones diarias de la pollería ubicada en Ayacucho, Perú.

### Objetivo del Sistema
- Digitalizar el registro de ventas en tiempo real
- Controlar el inventario de pollos y bebidas
- Gestionar gastos operativos diarios
- Facilitar el cierre de caja con resumen automático
- Eliminar el uso de cuadernos y cálculos manuales

### Tecnología Utilizada
| Componente | Tecnología |
|------------|------------|
| Frontend | Next.js 14 + React |
| Base de datos | Supabase (PostgreSQL) |
| Autenticación | Supabase Auth |
| Hosting | Vercel |
| Diseño | Tailwind CSS |

---

## 2. Funcionalidades Principales

### 2.1 Dashboard (Panel de Control)

Vista principal que muestra el resumen del día:

| Indicador | Descripción |
|-----------|-------------|
| Ingresos del día | Total de ventas realizadas |
| Pollos vendidos | Cantidad de pollos despachados |
| Pedidos procesados | Número de tickets generados |
| Ticket promedio | Ingreso promedio por venta |
| Stock actual | Pollos y bebidas disponibles |

### 2.2 Punto de Venta (POS)

Módulo para registrar ventas:

- Selección de productos del menú
- Asignación a mesa o para llevar
- Agregar notas especiales al pedido
- Selección de método de pago (Efectivo, Yape, Plin, Tarjeta)
- Confirmación de pago

### 2.3 Gestión de Mesas

Control visual del estado de las mesas:

| Estado | Color | Significado |
|--------|-------|-------------|
| Libre | Verde | Mesa disponible |
| Ocupada | Rojo | Mesa con pedido activo |

### 2.4 Vista de Cocina

Pantalla para el personal de cocina:

- Lista de pedidos pendientes
- Botón para marcar como "Listo"
- Actualización en tiempo real

### 2.5 Inventario Diario (Apertura)

Registro al inicio de cada jornada:

- Cantidad de pollos enteros
- Stock de bebidas
- Dinero inicial en caja (caja chica)

### 2.6 Cierre de Caja

Proceso de fin de jornada:

- Ingreso de pollos sobrantes (aderezados y en caja)
- Stock real de bebidas
- Dinero físico en caja
- Observaciones del día
- Generación automática de resumen para WhatsApp

### 2.7 Reportes

Estadísticas históricas:

- Ventas por período (hoy, ayer, semana, mes)
- Desglose por método de pago
- Productos más vendidos

---

## 3. Roles y Accesos

El sistema cuenta con diferentes perfiles de usuario:

| Rol | Dashboard | POS | Ventas | Mesas | Cocina | Apertura | Cierre | Reportes |
|-----|-----------|-----|--------|-------|--------|----------|--------|----------|
| **Administrador** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Cajera** | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ |
| **Mozo** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Cocina** | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |

### Descripción de Roles

- **Administrador**: Acceso completo al sistema. Puede ver reportes y gestionar usuarios.
- **Cajera**: Gestiona ventas, apertura y cierre de caja. No accede a cocina.
- **Mozo**: Registra pedidos y gestiona mesas. No hace apertura ni cierre.
- **Cocina**: Solo visualiza y actualiza estado de pedidos.

---

## 4. Guía de Seguridad

### Protección de Datos

El sistema implementa las siguientes medidas de seguridad:

| Medida | Descripción |
|--------|-------------|
| Autenticación | Acceso solo con email y contraseña registrados |
| Row Level Security (RLS) | Los datos solo son accesibles por usuarios autenticados |
| HTTPS | Toda la comunicación está encriptada |
| Sesiones | Las sesiones expiran automáticamente por inactividad |

### Recomendaciones

1. No compartir contraseñas entre empleados
2. Cerrar sesión al terminar el turno
3. No guardar contraseñas en el navegador de dispositivos compartidos
4. Reportar cualquier acceso no autorizado al administrador

---

## 5. Guía de Uso Rápido

### 5.1 Apertura del Día

**Antes de empezar a vender, realizar la apertura:**

1. Iniciar sesión en el sistema
2. Ir a **Apertura** en el menú lateral
3. Ingresar cantidad de **pollos enteros** disponibles
4. Ingresar cantidad de **bebidas** en stock
5. Ingresar **dinero inicial** en caja (caja chica)
6. Clic en **Iniciar Jornada**

### 5.2 Registrar una Venta

1. Ir a **Punto de Venta** (POS)
2. Seleccionar los productos del menú
3. Elegir la **mesa** o marcar como "Para llevar"
4. Agregar **notas** si es necesario (ej: "sin ají")
5. Clic en **Confirmar Pedido**
6. El pedido aparecerá en **Cocina** automáticamente

### 5.3 Confirmar Pago

1. Ir a **Ventas**
2. Buscar el pedido pendiente de pago
3. Seleccionar el **método de pago** (Efectivo, Yape, Plin, Tarjeta)
4. Clic en **Confirmar Pago**
5. La mesa se liberará automáticamente

### 5.4 Cierre del Día

**Al finalizar la jornada:**

1. Ir a **Cierre** en el menú lateral
2. Contar los **pollos sobrantes**:
   - Pollos aderezados (ya preparados)
   - Pollos en caja (crudos)
3. Contar las **bebidas restantes**
4. Contar el **dinero físico** en caja
5. Agregar **observaciones** si hay algo importante
6. Clic en **Finalizar Jornada**
7. Se generará un **resumen para WhatsApp** automáticamente

### 5.5 Restablecer el Día (Solo si hay error)

Si te equivocaste en la apertura:

1. Clic en tu usuario (esquina superior derecha)
2. Seleccionar **Restablecer Sistema**
3. Confirmar la acción
4. Hacer una nueva apertura con los datos correctos

**⚠️ Esto solo borra los datos del día actual, no el historial.**

---

## 6. Soporte

Para reportar problemas o solicitar ayuda:

- Contactar al administrador del sistema
- Describir el problema con detalle
- Incluir capturas de pantalla si es posible

---

*Documentación generada para Pocholo's Chicken POS*  
*Versión 1.0 - Febrero 2026*
