// ─── Entidades base ───────────────────────────────────────────────────────────

export type CategoriaProducto = 'FRO' | 'CR' | 'FIJACION'
export type TipoCliente = 'MINORISTA' | 'MAYORISTA' | 'DISTRIBUIDORA'
export type EstadoPresupuesto = 'BORRADOR' | 'ENVIADO' | 'APROBADO' | 'RECHAZADO' | 'VENCIDO'
export type EstadoFactura = 'PENDIENTE' | 'PAGADA' | 'VENCIDA' | 'ANULADA'
export type EstadoOrdenFabricacion = 'PENDIENTE' | 'EN_PROCESO' | 'COMPLETADA' | 'CANCELADA'
export type EstadoOrdenCompra = 'PENDIENTE' | 'RECIBIDA' | 'CANCELADA'
export type EtapaFabricacion = 'INYECCION' | 'FABRICACION' | 'ENVASADO' | 'COMPLETADO'

// ─── Producto ─────────────────────────────────────────────────────────────────

export interface Producto {
  id: number
  codigo: string
  descripcion: string
  categoria: CategoriaProducto
  stock: number
  stock_minimo: number
  precio_minorista: number
  precio_mayorista: number
  precio_distribuidora: number
  unidad: string
  activo: number
  creado_en: string
}

// ─── Materia Prima ────────────────────────────────────────────────────────────

export interface MateriaPrima {
  id: number
  codigo: string
  descripcion: string
  unidad: string
  stock: number
  stock_minimo: number
  precio_referencia: number
  activo: number
  creado_en: string
}

// ─── Proveedor ────────────────────────────────────────────────────────────────

export interface Proveedor {
  id: number
  razon_social: string
  cuit: string
  telefono: string
  email: string
  direccion: string
  condicion_pago: string
  activo: number
  creado_en: string
}

// ─── Cliente ──────────────────────────────────────────────────────────────────

export interface Cliente {
  id: number
  razon_social: string
  cuit: string
  telefono: string
  email: string
  direccion: string
  tipo: TipoCliente
  descuento: number
  activo: number
  creado_en: string
}

// ─── Presupuesto ──────────────────────────────────────────────────────────────

export interface Presupuesto {
  id: number
  numero: string
  cliente_id: number
  cliente_nombre?: string
  fecha: string
  validez_dias: number
  estado: EstadoPresupuesto
  subtotal: number
  descuento_extra: number
  total: number
  notas: string
  creado_en: string
}

export interface PresupuestoLinea {
  id: number
  presupuesto_id: number
  producto_id: number
  producto_codigo?: string
  producto_descripcion?: string
  cantidad: number
  precio_unitario: number
  descuento: number
  subtotal: number
}

// ─── Factura ──────────────────────────────────────────────────────────────────

export interface Factura {
  id: number
  numero: string
  presupuesto_id: number | null
  cliente_id: number
  cliente_nombre?: string
  fecha: string
  vencimiento: string
  estado: EstadoFactura
  subtotal: number
  descuento_extra: number
  total: number
  notas: string
  creado_en: string
}

export interface FacturaLinea {
  id: number
  factura_id: number
  producto_id: number
  producto_codigo?: string
  producto_descripcion?: string
  cantidad: number
  precio_unitario: number
  descuento: number
  subtotal: number
}

// ─── Orden de Compra ──────────────────────────────────────────────────────────

export interface OrdenCompra {
  id: number
  numero: string
  proveedor_id: number
  proveedor_nombre?: string
  fecha: string
  estado: EstadoOrdenCompra
  total: number
  notas: string
  creado_en: string
}

export interface OrdenCompraLinea {
  id: number
  orden_compra_id: number
  materia_prima_id: number
  materia_prima_descripcion?: string
  cantidad: number
  precio_unitario: number
  subtotal: number
}

// ─── Orden de Fabricación ─────────────────────────────────────────────────────

export interface OrdenFabricacion {
  id: number
  numero: string
  producto_id: number
  producto_codigo?: string
  producto_descripcion?: string
  cantidad: number
  etapa: EtapaFabricacion
  estado: EstadoOrdenFabricacion
  fecha_inicio: string
  fecha_fin: string | null
  notas: string
  creado_en: string
}

export interface OrdenFabricacionInsumo {
  id: number
  orden_fabricacion_id: number
  materia_prima_id: number
  materia_prima_descripcion?: string
  cantidad_necesaria: number
  cantidad_usada: number
}

// ─── Notificación ─────────────────────────────────────────────────────────────

export interface Notificacion {
  id: number
  tipo: 'STOCK_BAJO' | 'FACTURA_VENCIDA' | 'PRESUPUESTO_VENCIDO' | 'INFO'
  mensaje: string
  leida: number
  creado_en: string
}

// ─── IPC Channel map ──────────────────────────────────────────────────────────

export interface IpcChannels {
  // Productos
  'productos:listar': [void, Producto[]]
  'productos:crear': [Omit<Producto, 'id' | 'creado_en'>, Producto]
  'productos:actualizar': [Producto, Producto]
  'productos:eliminar': [number, void]
  // Materias Primas
  'materias-primas:listar': [void, MateriaPrima[]]
  'materias-primas:crear': [Omit<MateriaPrima, 'id' | 'creado_en'>, MateriaPrima]
  'materias-primas:actualizar': [MateriaPrima, MateriaPrima]
  'materias-primas:eliminar': [number, void]
  // Proveedores
  'proveedores:listar': [void, Proveedor[]]
  'proveedores:crear': [Omit<Proveedor, 'id' | 'creado_en'>, Proveedor]
  'proveedores:actualizar': [Proveedor, Proveedor]
  'proveedores:eliminar': [number, void]
  // Clientes
  'clientes:listar': [void, Cliente[]]
  'clientes:crear': [Omit<Cliente, 'id' | 'creado_en'>, Cliente]
  'clientes:actualizar': [Cliente, Cliente]
  'clientes:eliminar': [number, void]
  // Presupuestos
  'presupuestos:listar': [void, Presupuesto[]]
  'presupuestos:obtener': [number, { presupuesto: Presupuesto; lineas: PresupuestoLinea[] }]
  'presupuestos:crear': [{ presupuesto: Omit<Presupuesto, 'id' | 'creado_en'>; lineas: Omit<PresupuestoLinea, 'id' | 'presupuesto_id'>[] }, Presupuesto]
  'presupuestos:actualizar-estado': [{ id: number; estado: EstadoPresupuesto }, void]
  // Facturas
  'facturas:listar': [void, Factura[]]
  'facturas:obtener': [number, { factura: Factura; lineas: FacturaLinea[] }]
  'facturas:crear': [{ factura: Omit<Factura, 'id' | 'creado_en'>; lineas: Omit<FacturaLinea, 'id' | 'factura_id'>[] }, Factura]
  'facturas:actualizar-estado': [{ id: number; estado: EstadoFactura }, void]
  // Órdenes de compra
  'ordenes-compra:listar': [void, OrdenCompra[]]
  'ordenes-compra:obtener': [number, { orden: OrdenCompra; lineas: OrdenCompraLinea[] }]
  'ordenes-compra:crear': [{ orden: Omit<OrdenCompra, 'id' | 'creado_en'>; lineas: Omit<OrdenCompraLinea, 'id' | 'orden_compra_id'>[] }, OrdenCompra]
  'ordenes-compra:recibir': [number, void]
  // Fabricación
  'fabricacion:listar': [void, OrdenFabricacion[]]
  'fabricacion:obtener': [number, { orden: OrdenFabricacion; insumos: OrdenFabricacionInsumo[] }]
  'fabricacion:crear': [{ orden: Omit<OrdenFabricacion, 'id' | 'creado_en'>; insumos: Omit<OrdenFabricacionInsumo, 'id' | 'orden_fabricacion_id'>[] }, OrdenFabricacion]
  'fabricacion:avanzar-etapa': [number, OrdenFabricacion]
  // Notificaciones
  'notificaciones:listar': [void, Notificacion[]]
  'notificaciones:marcar-leida': [number, void]
  // Dashboard
  'dashboard:stats': [void, DashboardStats]
}

export interface DashboardStats {
  productos_bajo_stock: number
  materias_primas_bajo_stock: number
  presupuestos_pendientes: number
  facturas_pendientes: number
  facturas_vencidas: number
  ordenes_fabricacion_activas: number
  ventas_mes: number
  notificaciones_sin_leer: number
}
