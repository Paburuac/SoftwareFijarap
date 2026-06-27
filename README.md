# Fijarap — Sistema de Gestión v1.0.0

Sistema de gestión desktop para **Fijarap**, empresa fabricante de artículos de goma, sanitarios y fijaciones.

Desarrollado con **Electron + React + TypeScript + SQLite (sql.js)**.  
No requiere instalación de base de datos externa. Todos los datos se guardan localmente en `%APPDATA%\fijarap.db`.

---

## Instalación y ejecución

### Ejecutable portable
Correr directamente:
```
release\Fijarap Gestión 1.0.0.exe
```
No requiere instalación. Compatible con Windows 10/11 de 64 bits.

### Modo desarrollo
```bash
npm install
npm run dev
```

### Generar ejecutable
```bash
npm run dist
```
El `.exe` se genera en la carpeta `release\`.

### Tests
```bash
npm test          # corre todos los tests
npm run test:watch  # modo interactivo
```

---

## Módulos del sistema

### Dashboard
Pantalla principal con resumen en tiempo real:
- Ventas del mes en pesos
- Facturas pendientes y vencidas
- Presupuestos activos
- Órdenes de fabricación en curso
- Productos y materias primas con stock bajo
- Notificaciones sin leer

---

### Productos
Catálogo completo de artículos con más de 70 productos precargados en tres categorías:
- **FRO** — Antivibradores y pies antivibradores
- **CR** — Conectores, acoples y accesorios sanitarios
- **FIJACION** — Abrazaderas, grampas, tarugos, cajas de paso y accesorios

Funcionalidades:
- Alta, baja y modificación de productos
- Control de stock y stock mínimo
- Tres listas de precios: Minorista, Mayorista, Distribuidora
- Filtro por categoría y búsqueda
- Alerta visual cuando el stock es igual o inferior al mínimo

---

### Materias Primas
Gestión de insumos para producción:
- Alta, baja y modificación de materias primas
- Control de stock y stock mínimo
- Precio de referencia por unidad
- Alerta de stock bajo

---

### Proveedores
- Alta, baja y modificación de proveedores
- Datos de contacto: CUIT, teléfono, email, dirección
- Condición de pago

---

### Clientes
- Alta, baja y modificación de clientes
- Tres tipos: **Minorista**, **Mayorista**, **Distribuidora**
- Descuento personalizado por cliente
- Los precios en presupuestos y facturas se aplican automáticamente según el tipo

---

### Presupuestos
- Creación de presupuestos con líneas de productos
- Precio automático según tipo de cliente
- Descuento adicional sobre el total
- Estados: Borrador, Enviado, Aprobado, Rechazado, Vencido
- Días de validez configurables
- Vista de detalle con líneas

---

### Facturas
- Creación de facturas (desde cero o desde un presupuesto)
- Descuenta stock automáticamente al crear
- Estados: Pendiente, Pagada, Vencida, Anulada
- Numeración correlativa automática (`FACT-000001`, `FACT-000002`, ...)
- Vista de detalle con líneas

---

### Remitos
Comprobantes de entrega de mercadería:
- Creación con líneas de productos y cantidades
- Asociación opcional a una factura existente
- Estados: Pendiente, Entregado, Anulado
- Numeración correlativa automática (`REM-000001`, ...)
- Vista de detalle

---

### Órdenes de Compra
- Creación de órdenes de compra a proveedores con líneas de materias primas
- Estados: Pendiente, Recibida, Cancelada
- Al marcar como **Recibida**, suma el stock de las materias primas automáticamente
- Numeración correlativa automática

---

### Fabricación
Flujo de producción en etapas:
1. **Inyección**
2. **Fabricación**
3. **Envasado**
4. **Completado** — suma el stock del producto terminado automáticamente

- Asignación de materias primas (insumos) por orden
- Estados: Pendiente, En proceso, Completada, Cancelada

---

### Ajustes de Inventario
Correcciones manuales de stock sin pasar por una venta ni una orden de compra:
- **Entrada** — suma una cantidad al stock existente (ej: devolución, mercadería recibida fuera de OC)
- **Salida** — resta una cantidad del stock existente (ej: merma, rotura, pérdida)
- **Corrección** — establece el stock en un valor exacto (ej: resultado de inventario físico)
- Guarda historial completo: cantidad anterior, ajuste y cantidad nueva
- Permite múltiples productos en un mismo ajuste

---

### Caja
Gestión del movimiento de dinero:
- Registro de **ingresos** y **egresos** con concepto, monto, referencia y fecha
- Filtro de movimientos por rango de fechas
- **Tarjetas resumen**: saldo actual, ingresos y egresos del día y del mes
- **Arqueo de caja**: compara el saldo del sistema con el saldo real contado, calcula la diferencia y guarda el historial de arqueos
- Eliminación de movimientos

---

### Estadísticas
Análisis visual del rendimiento del negocio:
- **KPIs**: ventas del año, ventas del mes, ticket promedio, clientes activos
- **Gráfico de barras** de ventas mensuales (configurable: últimos 6, 12 o 24 meses)
- **Tabla de ventas** por mes con cantidad de facturas y monto total
- **Ranking de productos más vendidos** con barra de progreso relativa
- **Ranking de clientes top** con monto acumulado comprado

---

### Reportes y Listados
Informes consolidados con filtro por rango de fechas:

| Reporte | Descripción |
|---|---|
| **Stock** | Listado completo de productos con stock actual, mínimo y precios. Resalta en rojo los productos con stock bajo. Filtrable por categoría. |
| **Deuda clientes** | Clientes con facturas pendientes o vencidas, monto total adeudado y cantidad de facturas. |
| **Movimientos de caja** | Ingresos y egresos agrupados por día con resultado neto del período. |
| **Ventas por período** | Listado de facturas emitidas en el rango seleccionado con total acumulado. |

---

### Notificaciones
- Generación automática de alertas de stock bajo para productos y materias primas
- Marcado individual como leída
- Indicador de notificaciones sin leer en el sidebar

---

### Administración
Configuración general del sistema:
- **Datos de la empresa**: razón social, CUIT, dirección, teléfono, email, condición de IVA
- Los datos se guardan en la base de datos local y pueden usarse en documentos futuros
- Información de versión y stack tecnológico

---

## Tests automatizados

El proyecto incluye **35 tests unitarios** que se ejecutan con `npm test`.

| Archivo | Tests | Qué cubre |
|---|---|---|
| `caja.test.ts` | 9 | Saldos, ingresos, egresos, eliminación, arqueos, filtros por fecha |
| `ajustes.test.ts` | 8 | Entrada, salida, corrección, stock negativo, múltiples productos, historial |
| `remitos.test.ts` | 7 | Numeración correlativa, creación de líneas, cambio de estados |
| `estadisticas.test.ts` | 6 | Agrupación mensual, exclusión de anuladas, rankings, ticket promedio |
| `reportes.test.ts` | 8 | Deuda, stock bajo, filtros de fecha, agrupación de caja |
| `admin.test.ts` | 3 | Guardar config, upsert sin duplicados, valores por defecto |

---

## Stack tecnológico

| Componente | Tecnología |
|---|---|
| Framework desktop | Electron 30 |
| UI | React 18 + TypeScript |
| Estilos | Tailwind CSS |
| Base de datos | SQLite vía sql.js (WebAssembly, sin dependencias nativas) |
| Build | Vite 5 |
| Tests | Vitest |
| Íconos | Lucide React |
| Empaquetado | electron-builder |

> **¿Por qué sql.js?**  
> Se utiliza sql.js (SQLite en WebAssembly) en lugar de better-sqlite3 porque no requiere compilación nativa con Visual Studio Build Tools, lo que facilita la instalación y el build en cualquier equipo Windows.

---

## Base de datos

- **Desarrollo**: `%APPDATA%\fijarap-dev.db`
- **Producción**: `%APPDATA%\fijarap.db`

La base de datos se crea automáticamente en el primer inicio con todos los productos, tablas y configuración inicial.
