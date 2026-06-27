import { describe, it, expect, beforeEach } from 'vitest'
import type { Database } from 'sql.js'
import { crearDbTest, getOne, getAll } from './helpers/db'

let db: Database

beforeEach(async () => {
  db = await crearDbTest()
  db.run("INSERT INTO clientes (razon_social, tipo) VALUES ('Cliente A','MINORISTA')")
  db.run("INSERT INTO clientes (razon_social, tipo) VALUES ('Cliente B','MAYORISTA')")
  db.run("INSERT INTO productos (codigo, descripcion, categoria, stock) VALUES ('P001','Prod A','FRO',100)")
  db.run("INSERT INTO productos (codigo, descripcion, categoria, stock) VALUES ('P002','Prod B','CR',50)")
})

function insertarFactura(clienteId: number, total: number, fecha: string, estado = 'PENDIENTE') {
  const num = `FACT-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
  db.run(
    'INSERT INTO facturas (numero, cliente_id, fecha, vencimiento, estado, total, subtotal) VALUES (?,?,?,?,?,?,?)',
    [num, clienteId, fecha, fecha, estado, total, total]
  )
  return getOne<{ id: number }>(db, 'SELECT last_insert_rowid() as id')!.id
}

function insertarLinea(facturaId: number, productoId: number, cantidad: number, precio: number) {
  db.run(
    'INSERT INTO factura_lineas (factura_id, producto_id, cantidad, precio_unitario, descuento, subtotal) VALUES (?,?,?,?,0,?)',
    [facturaId, productoId, cantidad, precio, cantidad * precio]
  )
}

describe('Estadísticas — ventas mensuales', () => {
  it('agrupa facturas por mes correctamente', () => {
    insertarFactura(1, 1000, '2026-01-10')
    insertarFactura(1, 2000, '2026-01-20')
    insertarFactura(2, 3000, '2026-02-05')

    const rows = getAll<{ mes: string; total: number; cantidad: number }>(db, `
      SELECT substr(fecha,1,7) as mes, COALESCE(SUM(total),0) as total, COUNT(*) as cantidad
      FROM facturas WHERE estado != 'ANULADA'
      GROUP BY substr(fecha,1,7) ORDER BY mes
    `)
    expect(rows).toHaveLength(2)
    expect(rows[0].mes).toBe('2026-01')
    expect(rows[0].total).toBe(3000)
    expect(rows[0].cantidad).toBe(2)
    expect(rows[1].total).toBe(3000)
  })

  it('excluye facturas anuladas', () => {
    insertarFactura(1, 5000, '2026-01-10', 'ANULADA')
    insertarFactura(1, 1000, '2026-01-15', 'PAGADA')

    const total = getOne<{ v: number }>(db, "SELECT COALESCE(SUM(total),0) as v FROM facturas WHERE estado!='ANULADA'")?.v
    expect(total).toBe(1000)
  })
})

describe('Estadísticas — productos top', () => {
  it('ordena productos por monto vendido', () => {
    const f1 = insertarFactura(1, 5000, '2026-01-10')
    const f2 = insertarFactura(2, 3000, '2026-01-15')
    insertarLinea(f1, 1, 10, 300)  // prod 1: 3000
    insertarLinea(f1, 2, 5, 400)   // prod 2: 2000
    insertarLinea(f2, 1, 5, 400)   // prod 1: +2000 = 5000

    const top = getAll<{ producto_id: number; total_vendido: number }>(db, `
      SELECT fl.producto_id, COALESCE(SUM(fl.subtotal),0) as total_vendido
      FROM factura_lineas fl JOIN facturas f ON f.id=fl.factura_id
      WHERE f.estado!='ANULADA'
      GROUP BY fl.producto_id ORDER BY total_vendido DESC
    `)
    expect(top[0].producto_id).toBe(1)
    expect(top[0].total_vendido).toBe(5000)
    expect(top[1].total_vendido).toBe(2000)
  })
})

describe('Estadísticas — clientes top', () => {
  it('suma total comprado por cliente', () => {
    insertarFactura(1, 4000, '2026-01-10')
    insertarFactura(1, 6000, '2026-01-20')
    insertarFactura(2, 3000, '2026-01-15')

    const top = getAll<{ cliente_id: number; total_comprado: number }>(db, `
      SELECT cliente_id, COALESCE(SUM(total),0) as total_comprado
      FROM facturas WHERE estado!='ANULADA'
      GROUP BY cliente_id ORDER BY total_comprado DESC
    `)
    expect(top[0].cliente_id).toBe(1)
    expect(top[0].total_comprado).toBe(10000)
  })
})

describe('Estadísticas — ticket promedio', () => {
  it('calcula el promedio correcto', () => {
    insertarFactura(1, 1000, '2026-01-10')
    insertarFactura(2, 3000, '2026-01-20')

    const avg = getOne<{ v: number }>(db, "SELECT AVG(total) as v FROM facturas WHERE estado!='ANULADA'")?.v
    expect(avg).toBe(2000)
  })
})
