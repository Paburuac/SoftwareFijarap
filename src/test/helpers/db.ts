import initSqlJs, { Database } from 'sql.js'

let _db: Database | null = null

export async function crearDbTest(): Promise<Database> {
  const SQL = await initSqlJs()
  const db = new SQL.Database()
  db.run('PRAGMA foreign_keys = ON')
  db.run(`
    CREATE TABLE IF NOT EXISTS productos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo TEXT NOT NULL UNIQUE,
      descripcion TEXT NOT NULL,
      categoria TEXT NOT NULL,
      stock REAL NOT NULL DEFAULT 0,
      stock_minimo REAL NOT NULL DEFAULT 10,
      precio_minorista REAL NOT NULL DEFAULT 0,
      precio_mayorista REAL NOT NULL DEFAULT 0,
      precio_distribuidora REAL NOT NULL DEFAULT 0,
      unidad TEXT NOT NULL DEFAULT 'UN',
      activo INTEGER NOT NULL DEFAULT 1,
      creado_en TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS materias_primas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo TEXT NOT NULL UNIQUE,
      descripcion TEXT NOT NULL,
      unidad TEXT NOT NULL DEFAULT 'KG',
      stock REAL NOT NULL DEFAULT 0,
      stock_minimo REAL NOT NULL DEFAULT 5,
      precio_referencia REAL NOT NULL DEFAULT 0,
      activo INTEGER NOT NULL DEFAULT 1,
      creado_en TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      razon_social TEXT NOT NULL,
      cuit TEXT NOT NULL DEFAULT '',
      telefono TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      direccion TEXT NOT NULL DEFAULT '',
      tipo TEXT NOT NULL DEFAULT 'MINORISTA',
      descuento REAL NOT NULL DEFAULT 0,
      activo INTEGER NOT NULL DEFAULT 1,
      creado_en TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS proveedores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      razon_social TEXT NOT NULL,
      cuit TEXT NOT NULL DEFAULT '',
      telefono TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      direccion TEXT NOT NULL DEFAULT '',
      condicion_pago TEXT NOT NULL DEFAULT 'Contado',
      activo INTEGER NOT NULL DEFAULT 1,
      creado_en TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS facturas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      numero TEXT NOT NULL UNIQUE,
      presupuesto_id INTEGER,
      cliente_id INTEGER NOT NULL REFERENCES clientes(id),
      fecha TEXT NOT NULL DEFAULT (date('now')),
      vencimiento TEXT NOT NULL,
      estado TEXT NOT NULL DEFAULT 'PENDIENTE',
      subtotal REAL NOT NULL DEFAULT 0,
      descuento_extra REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0,
      notas TEXT NOT NULL DEFAULT '',
      creado_en TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS factura_lineas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      factura_id INTEGER NOT NULL REFERENCES facturas(id),
      producto_id INTEGER NOT NULL REFERENCES productos(id),
      cantidad REAL NOT NULL DEFAULT 1,
      precio_unitario REAL NOT NULL DEFAULT 0,
      descuento REAL NOT NULL DEFAULT 0,
      subtotal REAL NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS caja_movimientos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tipo TEXT NOT NULL CHECK(tipo IN ('INGRESO','EGRESO')),
      concepto TEXT NOT NULL,
      monto REAL NOT NULL,
      referencia TEXT NOT NULL DEFAULT '',
      fecha TEXT NOT NULL DEFAULT (date('now')),
      creado_en TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS caja_arqueos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha TEXT NOT NULL DEFAULT (datetime('now')),
      saldo_sistema REAL NOT NULL DEFAULT 0,
      saldo_real REAL NOT NULL DEFAULT 0,
      diferencia REAL NOT NULL DEFAULT 0,
      notas TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS remitos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      numero TEXT NOT NULL UNIQUE,
      factura_id INTEGER,
      cliente_id INTEGER NOT NULL REFERENCES clientes(id),
      fecha TEXT NOT NULL DEFAULT (date('now')),
      estado TEXT NOT NULL DEFAULT 'PENDIENTE',
      notas TEXT NOT NULL DEFAULT '',
      creado_en TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS remito_lineas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      remito_id INTEGER NOT NULL REFERENCES remitos(id),
      producto_id INTEGER NOT NULL REFERENCES productos(id),
      cantidad REAL NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS ajustes_inventario (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tipo TEXT NOT NULL,
      motivo TEXT NOT NULL,
      fecha TEXT NOT NULL DEFAULT (date('now')),
      creado_en TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS ajuste_inventario_lineas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ajuste_id INTEGER NOT NULL REFERENCES ajustes_inventario(id),
      producto_id INTEGER NOT NULL REFERENCES productos(id),
      cantidad_anterior REAL NOT NULL DEFAULT 0,
      cantidad_ajuste REAL NOT NULL DEFAULT 0,
      cantidad_nueva REAL NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS notificaciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tipo TEXT NOT NULL,
      mensaje TEXT NOT NULL,
      leida INTEGER NOT NULL DEFAULT 0,
      creado_en TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS config (
      clave TEXT PRIMARY KEY,
      valor TEXT NOT NULL
    );
  `)
  db.run("INSERT OR IGNORE INTO config VALUES ('ultimo_nro_presupuesto', '0')")
  db.run("INSERT OR IGNORE INTO config VALUES ('ultimo_nro_factura', '0')")
  db.run("INSERT OR IGNORE INTO config VALUES ('ultimo_nro_remito', '0')")
  db.run("INSERT OR IGNORE INTO config VALUES ('ultimo_nro_ajuste', '0')")
  return db
}

export function getOne<T>(db: Database, sql: string, params: unknown[] = []): T | undefined {
  const stmt = db.prepare(sql)
  stmt.bind(params as never)
  if (stmt.step()) { const row = stmt.getAsObject() as T; stmt.free(); return row }
  stmt.free()
  return undefined
}

export function getAll<T>(db: Database, sql: string, params: unknown[] = []): T[] {
  const stmt = db.prepare(sql)
  stmt.bind(params as never)
  const rows: T[] = []
  while (stmt.step()) rows.push(stmt.getAsObject() as T)
  stmt.free()
  return rows
}

export function siguienteNumero(db: Database, clave: string, prefijo: string): string {
  const row = getOne<{ valor: string }>(db, 'SELECT valor FROM config WHERE clave=?', [clave])
  const siguiente = parseInt(row?.valor ?? '0') + 1
  db.run('UPDATE config SET valor=? WHERE clave=?', [String(siguiente), clave])
  return `${prefijo}-${String(siguiente).padStart(6, '0')}`
}
