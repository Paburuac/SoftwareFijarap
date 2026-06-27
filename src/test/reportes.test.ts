import { describe, it, expect, beforeEach } from 'vitest'
import type { Database } from 'sql.js'
import { crearDbTest, getOne, getAll } from './helpers/db'

let db: Database

beforeEach(async () => {
  db = await crearDbTest()
  db.run("INSERT INTO clientes (razon_social, tipo) VALUES ('Deudor S.A.','MAYORISTA')")
  db.run("INSERT INTO clientes (razon_social, tipo) VALUES ('Al día SRL','MINORISTA')")
  db.run("INSERT INTO productos (codigo, descripcion, categoria, stock, stock_minimo, precio_minorista) VALUES ('P001','Prod A','FRO',5,10,100)")
  db.run("INSERT INTO productos (codigo, descripcion, categoria, stock, stock_minimo, precio_minorista) VALUES ('P002','Prod B','CR',20,5,50)")
})

describe('Reportes — deuda clientes', () => {
  it('lista clientes con facturas pendientes', () => {
    db.run("INSERT INTO facturas (numero,cliente_id,fecha,vencimiento,estado,total,subtotal) VALUES ('F001',1,'2026-01-01','2026-02-01','PENDIENTE',5000,5000)")
    db.run("INSERT INTO facturas (numero,cliente_id,fecha,vencimiento,estado,total,subtotal) VALUES ('F002',1,'2026-01-10','2026-02-10','VENCIDA',3000,3000)")
    db.run("INSERT INTO facturas (numero,cliente_id,fecha,vencimiento,estado,total,subtotal) VALUES ('F003',2,'2026-01-05','2026-02-05','PAGADA',2000,2000)")

    const deuda = getAll<{ cliente_id: number; total_deuda: number; facturas_pendientes: number }>(db, `
      SELECT f.cliente_id, COALESCE(SUM(f.total),0) as total_deuda, COUNT(*) as facturas_pendientes
      FROM facturas f WHERE f.estado IN ('PENDIENTE','VENCIDA')
      GROUP BY f.cliente_id ORDER BY total_deuda DESC
    `)
    expect(deuda).toHaveLength(1)
    expect(deuda[0].cliente_id).toBe(1)
    expect(deuda[0].total_deuda).toBe(8000)
    expect(deuda[0].facturas_pendientes).toBe(2)
  })

  it('cliente sin deuda no aparece en el reporte', () => {
    db.run("INSERT INTO facturas (numero,cliente_id,fecha,vencimiento,estado,total,subtotal) VALUES ('F001',2,'2026-01-01','2026-02-01','PAGADA',1000,1000)")
    const deuda = getAll(db, "SELECT * FROM facturas WHERE estado IN ('PENDIENTE','VENCIDA')")
    expect(deuda).toHaveLength(0)
  })
})

describe('Reportes — stock', () => {
  it('identifica productos con stock bajo', () => {
    const bajos = getAll<{ codigo: string }>(db, 'SELECT * FROM productos WHERE stock <= stock_minimo AND activo=1')
    expect(bajos).toHaveLength(1)
    expect(bajos[0].codigo).toBe('P001')
  })

  it('filtra por categoría', () => {
    const fro = getAll(db, "SELECT * FROM productos WHERE categoria='FRO' AND activo=1")
    expect(fro).toHaveLength(1)
    const cr = getAll(db, "SELECT * FROM productos WHERE categoria='CR' AND activo=1")
    expect(cr).toHaveLength(1)
  })
})

describe('Reportes — ventas por período', () => {
  it('filtra facturas por rango de fechas', () => {
    db.run("INSERT INTO facturas (numero,cliente_id,fecha,vencimiento,estado,total,subtotal) VALUES ('F001',1,'2026-01-10','2026-02-10','PAGADA',1000,1000)")
    db.run("INSERT INTO facturas (numero,cliente_id,fecha,vencimiento,estado,total,subtotal) VALUES ('F002',1,'2026-02-15','2026-03-15','PENDIENTE',2000,2000)")
    db.run("INSERT INTO facturas (numero,cliente_id,fecha,vencimiento,estado,total,subtotal) VALUES ('F003',1,'2026-03-20','2026-04-20','PAGADA',3000,3000)")

    const enero = getAll(db, "SELECT * FROM facturas WHERE fecha BETWEEN '2026-01-01' AND '2026-01-31'")
    expect(enero).toHaveLength(1)

    const total_q1 = getOne<{ v: number }>(db, "SELECT COALESCE(SUM(total),0) as v FROM facturas WHERE estado!='ANULADA' AND fecha BETWEEN '2026-01-01' AND '2026-03-31'")?.v
    expect(total_q1).toBe(6000)
  })
})

describe('Reportes — caja por período', () => {
  it('agrupa ingresos y egresos por día', () => {
    db.run("INSERT INTO caja_movimientos (tipo,concepto,monto,referencia,fecha) VALUES ('INGRESO','A',1000,'','2026-01-05')")
    db.run("INSERT INTO caja_movimientos (tipo,concepto,monto,referencia,fecha) VALUES ('INGRESO','B',500,'','2026-01-05')")
    db.run("INSERT INTO caja_movimientos (tipo,concepto,monto,referencia,fecha) VALUES ('EGRESO','C',200,'','2026-01-05')")

    const reporte = getAll<{ fecha: string; ingresos: number; egresos: number; saldo_dia: number }>(db, `
      SELECT fecha,
             COALESCE(SUM(CASE WHEN tipo='INGRESO' THEN monto ELSE 0 END),0) as ingresos,
             COALESCE(SUM(CASE WHEN tipo='EGRESO'  THEN monto ELSE 0 END),0) as egresos,
             COALESCE(SUM(CASE WHEN tipo='INGRESO' THEN monto ELSE -monto END),0) as saldo_dia
      FROM caja_movimientos WHERE fecha BETWEEN '2026-01-01' AND '2026-01-31'
      GROUP BY fecha
    `)
    expect(reporte).toHaveLength(1)
    expect(reporte[0].ingresos).toBe(1500)
    expect(reporte[0].egresos).toBe(200)
    expect(reporte[0].saldo_dia).toBe(1300)
  })
})
