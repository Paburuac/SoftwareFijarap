import initSqlJs, { Database, SqlJsStatic } from 'sql.js'
import path from 'path'
import fs from 'fs'
import { app } from 'electron'

let _db: Database | null = null
let _SQL: SqlJsStatic | null = null
let _dbPath: string = ''

export async function initDb(): Promise<void> {
  const wasmPath = app.isPackaged
    ? path.join(process.resourcesPath, 'sql-wasm.wasm')
    : path.join(app.getAppPath(), 'node_modules/sql.js/dist/sql-wasm.wasm')

  _SQL = await initSqlJs({ locateFile: () => wasmPath })

  _dbPath = app.isPackaged
    ? path.join(app.getPath('userData'), 'fijarap.db')
    : path.join(app.getPath('userData'), 'fijarap-dev.db')

  if (fs.existsSync(_dbPath)) {
    const buf = fs.readFileSync(_dbPath)
    _db = new _SQL.Database(buf)
  } else {
    _db = new _SQL.Database()
  }

  _db.run('PRAGMA foreign_keys = ON')
  crearTablas()
  cargarDatosIniciales()
  persistir()
}

export function getDb(): Database {
  if (!_db) throw new Error('Base de datos no inicializada')
  return _db
}

export function persistir(): void {
  if (!_db || !_dbPath) return
  const data = _db.export()
  fs.writeFileSync(_dbPath, Buffer.from(data))
}

// ─── Helpers síncronos compatibles con la API de sql.js ──────────────────────

export function getOne<T>(sql: string, params: unknown[] = []): T | undefined {
  const stmt = getDb().prepare(sql)
  stmt.bind(params as never)
  if (stmt.step()) {
    const row = stmt.getAsObject() as T
    stmt.free()
    return row
  }
  stmt.free()
  return undefined
}

export function getAll<T>(sql: string, params: unknown[] = []): T[] {
  const stmt = getDb().prepare(sql)
  stmt.bind(params as never)
  const rows: T[] = []
  while (stmt.step()) rows.push(stmt.getAsObject() as T)
  stmt.free()
  return rows
}

export function insertAndGetId(sql: string, params: Record<string, unknown>): number {
  getDb().run(sql, params as never)
  const row = getOne<{ id: number }>('SELECT last_insert_rowid() as id')
  persistir()
  return row?.id ?? 0
}

export function siguienteNumero(clave: string, prefijo: string): string {
  const row = getOne<{ valor: string }>('SELECT valor FROM config WHERE clave = ?', [clave])
  const siguiente = parseInt(row?.valor ?? '0') + 1
  getDb().run('UPDATE config SET valor = ? WHERE clave = ?', [String(siguiente), clave])
  return `${prefijo}-${String(siguiente).padStart(6, '0')}`
}

// ─── Schema ───────────────────────────────────────────────────────────────────

function crearTablas() {
  const db = getDb()
  db.run(`
    CREATE TABLE IF NOT EXISTS productos (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo           TEXT    NOT NULL UNIQUE,
      descripcion      TEXT    NOT NULL,
      categoria        TEXT    NOT NULL,
      stock            REAL    NOT NULL DEFAULT 0,
      stock_minimo     REAL    NOT NULL DEFAULT 10,
      precio_minorista REAL    NOT NULL DEFAULT 0,
      precio_mayorista REAL    NOT NULL DEFAULT 0,
      precio_distribuidora REAL NOT NULL DEFAULT 0,
      unidad           TEXT    NOT NULL DEFAULT 'UN',
      activo           INTEGER NOT NULL DEFAULT 1,
      creado_en        TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS materias_primas (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo           TEXT    NOT NULL UNIQUE,
      descripcion      TEXT    NOT NULL,
      unidad           TEXT    NOT NULL DEFAULT 'KG',
      stock            REAL    NOT NULL DEFAULT 0,
      stock_minimo     REAL    NOT NULL DEFAULT 5,
      precio_referencia REAL   NOT NULL DEFAULT 0,
      activo           INTEGER NOT NULL DEFAULT 1,
      creado_en        TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS proveedores (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      razon_social     TEXT    NOT NULL,
      cuit             TEXT    NOT NULL DEFAULT '',
      telefono         TEXT    NOT NULL DEFAULT '',
      email            TEXT    NOT NULL DEFAULT '',
      direccion        TEXT    NOT NULL DEFAULT '',
      condicion_pago   TEXT    NOT NULL DEFAULT 'Contado',
      activo           INTEGER NOT NULL DEFAULT 1,
      creado_en        TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS clientes (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      razon_social     TEXT    NOT NULL,
      cuit             TEXT    NOT NULL DEFAULT '',
      telefono         TEXT    NOT NULL DEFAULT '',
      email            TEXT    NOT NULL DEFAULT '',
      direccion        TEXT    NOT NULL DEFAULT '',
      tipo             TEXT    NOT NULL DEFAULT 'MINORISTA',
      descuento        REAL    NOT NULL DEFAULT 0,
      activo           INTEGER NOT NULL DEFAULT 1,
      creado_en        TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS presupuestos (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      numero           TEXT    NOT NULL UNIQUE,
      cliente_id       INTEGER NOT NULL REFERENCES clientes(id),
      fecha            TEXT    NOT NULL DEFAULT (date('now')),
      validez_dias     INTEGER NOT NULL DEFAULT 15,
      estado           TEXT    NOT NULL DEFAULT 'BORRADOR',
      subtotal         REAL    NOT NULL DEFAULT 0,
      descuento_extra  REAL    NOT NULL DEFAULT 0,
      total            REAL    NOT NULL DEFAULT 0,
      notas            TEXT    NOT NULL DEFAULT '',
      creado_en        TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS presupuesto_lineas (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      presupuesto_id   INTEGER NOT NULL REFERENCES presupuestos(id),
      producto_id      INTEGER NOT NULL REFERENCES productos(id),
      cantidad         REAL    NOT NULL DEFAULT 1,
      precio_unitario  REAL    NOT NULL DEFAULT 0,
      descuento        REAL    NOT NULL DEFAULT 0,
      subtotal         REAL    NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS facturas (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      numero           TEXT    NOT NULL UNIQUE,
      presupuesto_id   INTEGER,
      cliente_id       INTEGER NOT NULL REFERENCES clientes(id),
      fecha            TEXT    NOT NULL DEFAULT (date('now')),
      vencimiento      TEXT    NOT NULL,
      estado           TEXT    NOT NULL DEFAULT 'PENDIENTE',
      subtotal         REAL    NOT NULL DEFAULT 0,
      descuento_extra  REAL    NOT NULL DEFAULT 0,
      total            REAL    NOT NULL DEFAULT 0,
      notas            TEXT    NOT NULL DEFAULT '',
      creado_en        TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS factura_lineas (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      factura_id       INTEGER NOT NULL REFERENCES facturas(id),
      producto_id      INTEGER NOT NULL REFERENCES productos(id),
      cantidad         REAL    NOT NULL DEFAULT 1,
      precio_unitario  REAL    NOT NULL DEFAULT 0,
      descuento        REAL    NOT NULL DEFAULT 0,
      subtotal         REAL    NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS ordenes_compra (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      numero           TEXT    NOT NULL UNIQUE,
      proveedor_id     INTEGER NOT NULL REFERENCES proveedores(id),
      fecha            TEXT    NOT NULL DEFAULT (date('now')),
      estado           TEXT    NOT NULL DEFAULT 'PENDIENTE',
      total            REAL    NOT NULL DEFAULT 0,
      notas            TEXT    NOT NULL DEFAULT '',
      creado_en        TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS orden_compra_lineas (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      orden_compra_id  INTEGER NOT NULL REFERENCES ordenes_compra(id),
      materia_prima_id INTEGER NOT NULL REFERENCES materias_primas(id),
      cantidad         REAL    NOT NULL DEFAULT 1,
      precio_unitario  REAL    NOT NULL DEFAULT 0,
      subtotal         REAL    NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS ordenes_fabricacion (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      numero           TEXT    NOT NULL UNIQUE,
      producto_id      INTEGER NOT NULL REFERENCES productos(id),
      cantidad         REAL    NOT NULL DEFAULT 1,
      etapa            TEXT    NOT NULL DEFAULT 'INYECCION',
      estado           TEXT    NOT NULL DEFAULT 'PENDIENTE',
      fecha_inicio     TEXT    NOT NULL DEFAULT (date('now')),
      fecha_fin        TEXT,
      notas            TEXT    NOT NULL DEFAULT '',
      creado_en        TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS orden_fabricacion_insumos (
      id                    INTEGER PRIMARY KEY AUTOINCREMENT,
      orden_fabricacion_id  INTEGER NOT NULL REFERENCES ordenes_fabricacion(id),
      materia_prima_id      INTEGER NOT NULL REFERENCES materias_primas(id),
      cantidad_necesaria    REAL    NOT NULL DEFAULT 0,
      cantidad_usada        REAL    NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS notificaciones (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      tipo             TEXT    NOT NULL,
      mensaje          TEXT    NOT NULL,
      leida            INTEGER NOT NULL DEFAULT 0,
      creado_en        TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS config (
      clave            TEXT    PRIMARY KEY,
      valor            TEXT    NOT NULL
    );
  `)
}

function cargarDatosIniciales() {
  const db = getDb()
  const row = getOne<{ c: number }>('SELECT COUNT(*) as c FROM productos')
  if ((row?.c ?? 0) > 0) return

  const fro = [
    ['FRO 1282', 'Antivibrador cónico sin vástago', 'FRO'],
    ['FRO 1284', 'Antivibrador con vástago macho inferior', 'FRO'],
    ['FRO 1285', 'Antivibrador con vástago macho superior', 'FRO'],
    ['FRO 1286', 'Antivibrador cónico grande sin vástago', 'FRO'],
    ['FRO 1287', 'Antivibrador cilíndrico vástago largo', 'FRO'],
    ['FRO 1288', 'Antivibrador cilíndrico con base hexagonal', 'FRO'],
    ['FRO 1289', 'Antivibrador cónico pequeño con vástago', 'FRO'],
    ['FRO 1290', 'Antivibrador cónico vástago superior largo', 'FRO'],
    ['FRO 1291', 'Antivibrador cónico invertido con vástago', 'FRO'],
    ['FRO 1292', 'Antivibrador doble con perno central', 'FRO'],
    ['FRO 1293', 'Antivibrador tipo buje con vástago', 'FRO'],
    ['FRO 1294', 'Antivibrador disco con vástago inferior', 'FRO'],
    ['FRO 1295', 'Antivibrador disco con vástago superior', 'FRO'],
    ['FRO 1296', 'Antivibrador cilíndrico macizo', 'FRO'],
    ['FRO 1298', 'Antivibrador cilíndrico con rosca interna', 'FRO'],
    ['FRO 1299', 'Pie antivibrador plano con tuerca', 'FRO'],
    ['FRO 1300', 'Pie antivibrador con vástago largo ajustable', 'FRO'],
    ['FRO 1301', 'Antivibrador tipo rueda metálica', 'FRO'],
    ['FRO 1302', 'Antivibrador tipo rueda doble metálica', 'FRO'],
    ['FRO 1303', 'Base antivibradora metálica con perforaciones', 'FRO'],
    ['FRO 1304', 'Antivibrador plano con vástago central', 'FRO'],
    ['FRO 1305', 'Antivibrador cilíndrico bajo con base', 'FRO'],
    ['FRO 1306', 'Antivibrador cilíndrico mediano', 'FRO'],
    ['FRO 1307', 'Soporte antivibrador tipo ángulo metálico', 'FRO'],
    ['FRO 1383', 'Pie antivibrador plano grande con tuerca', 'FRO'],
  ]
  const cr = [
    ['CR 101', 'Conector doble espiga 1/2" Nylon x50', 'CR'],
    ['CR 102', 'Conector rosca espiga 1/2" Nylon x50', 'CR'],
    ['CR 120', 'Tubo de reparación PP y termofusión 1/2"', 'CR'],
    ['CR 126', 'Acople compresión 1/2" - termofusión a rosca macho 1/2"', 'CR'],
    ['CR 127', 'Acople compresión 1/2" PP - termofusión a rosca 1/2"', 'CR'],
    ['CR 128', 'Acople compresión 1/2" PP - termofusión a rosca macho 3/4" x10u', 'CR'],
    ['CR 129', 'Acople compresión 1/2" PP - termofusión hembra 3/4"', 'CR'],
    ['CR 130', 'Tuerca 3/4 guarnición y espiga 1/2"', 'CR'],
    ['CR 131', 'Tuerca 1" guarnición espiga 1/2"', 'CR'],
    ['CR 132', 'Tuerca 1" guarnición y espiga 3/4" Nylon', 'CR'],
    ['CR 133', 'Tuerca 3/4" Nylon', 'CR'],
    ['CR 134', 'Espiga plana 1/2" Nylon', 'CR'],
    ['CR 135', 'O-ring caño 1/2" K6 polipropileno', 'CR'],
    ['CR 136', 'O-ring caño Ø20 termofusión', 'CR'],
    ['CR 137', 'O-ring caño polietileno K6', 'CR'],
    ['CR 138', 'Espiga plana 3/4" Nylon', 'CR'],
    ['CR 139', 'Guarnición repuesto para espiga 1/2"', 'CR'],
    ['CR 140', 'Repuesto guarnición para espiga 3/4"', 'CR'],
  ]
  const fijaciones = [
    ['FIJ-ABRA-16-20', 'Abrazadera multidiámetro Ø16-20mm', 'FIJACION'],
    ['FIJ-ABRA-20-25', 'Abrazadera multidiámetro Ø20-22-25mm', 'FIJACION'],
    ['FIJ-ABRA-25-32', 'Abrazadera multidiámetro Ø25-32mm', 'FIJACION'],
    ['FIJ-ABRA-32-40', 'Abrazadera multidiámetro Ø32-40mm', 'FIJACION'],
    ['FIJ-ABRA-90-110', 'Abrazadera multidiámetro Ø90-100-110mm', 'FIJACION'],
    ['FIJ-ABRA-RC-17-34', 'Abrazadera multidiámetro con rosca Ø17-34mm', 'FIJACION'],
    ['FIJ-FIJACABLE', 'Fijacable para cañerías', 'FIJACION'],
    ['FIJ-GRAMPA-U-20', 'Grampa U con tarugo Ø20mm', 'FIJACION'],
    ['FIJ-GRAMPA-U-25', 'Grampa U con tarugo Ø25mm', 'FIJACION'],
    ['FIJ-GRAMPA-COAX', 'Grampa coaxial', 'FIJACION'],
    ['FIJ-RAPIC-16-20', 'Rapiclip Ø16-20mm', 'FIJACION'],
    ['FIJ-RAPIC-20-22', 'Rapiclip Ø20-22mm', 'FIJACION'],
    ['FIJ-RAPIC-25-28', 'Rapiclip Ø25-28mm', 'FIJACION'],
    ['FIJ-TARUG-6', 'Tarugorap para precintos Ø6mm', 'FIJACION'],
    ['FIJ-TARUG-8', 'Tarugorap para precintos Ø8mm', 'FIJACION'],
    ['FIJ-PERFIL-205', 'Perfil para abrazaderas 2,05mt', 'FIJACION'],
    ['FIJ-TARUG-COM', 'Tarugos comunes y para ladrillos huecos', 'FIJACION'],
    ['FIJ-TARUG-CANAL', 'Tarugo para cable canal', 'FIJACION'],
    ['FIJ-TARUG-YESO-6', 'Tarugo para yeso Ø6mm', 'FIJACION'],
    ['FIJ-TARUG-YESO-8', 'Tarugo para yeso Ø8mm', 'FIJACION'],
    ['FIJ-PERCHA', 'Percha blistera', 'FIJACION'],
    ['FIJ-TAPA-RED', 'Tapa ciega caja de conexión redonda', 'FIJACION'],
    ['FIJ-TAPA-RECT', 'Tapa ciega caja de conexión rectangular', 'FIJACION'],
    ['FIJ-CAJA-PASO', 'Caja de paso 10x10cm', 'FIJACION'],
    ['FIJ-CAJA-LUZ-R', 'Caja de luz rectangular', 'FIJACION'],
    ['FIJ-CAJA-LUZ-O', 'Caja de luz octogonal', 'FIJACION'],
    ['FIJ-ABRA-MET', 'Abrazadera multidiámetro metálica', 'FIJACION'],
  ]

  for (const [codigo, desc, cat] of [...fro, ...cr, ...fijaciones]) {
    db.run(
      'INSERT INTO productos (codigo, descripcion, categoria, stock, stock_minimo, precio_minorista, precio_mayorista, precio_distribuidora, unidad) VALUES (?,?,?,0,10,0,0,0,"UN")',
      [codigo, desc, cat]
    )
  }

  db.run("INSERT OR IGNORE INTO config VALUES ('ultimo_nro_presupuesto', '0')")
  db.run("INSERT OR IGNORE INTO config VALUES ('ultimo_nro_factura', '0')")
  db.run("INSERT OR IGNORE INTO config VALUES ('ultimo_nro_orden_compra', '0')")
  db.run("INSERT OR IGNORE INTO config VALUES ('ultimo_nro_fabricacion', '0')")

  persistir()
}
