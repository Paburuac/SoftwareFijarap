import { describe, it, expect, beforeEach } from 'vitest'
import type { Database } from 'sql.js'
import { crearDbTest, getOne, getAll, siguienteNumero } from './helpers/db'

let db: Database

beforeEach(async () => {
  db = await crearDbTest()
  db.run("INSERT INTO clientes (razon_social, tipo) VALUES ('Cliente Test','MINORISTA')")
  db.run("INSERT INTO productos (codigo, descripcion, categoria, stock) VALUES ('P001','Prod A','FRO',100)")
  db.run("INSERT INTO productos (codigo, descripcion, categoria, stock) VALUES ('P002','Prod B','CR',50)")
})

function crearRemito(clienteId: number, lineas: { producto_id: number; cantidad: number }[]) {
  const numero = siguienteNumero(db, 'ultimo_nro_remito', 'REM')
  db.run(
    "INSERT INTO remitos (numero, factura_id, cliente_id, fecha, estado, notas) VALUES (?,NULL,?,'2026-01-01','PENDIENTE','')",
    [numero, clienteId]
  )
  const remId = getOne<{ id: number }>(db, 'SELECT last_insert_rowid() as id')!.id
  for (const l of lineas) {
    db.run('INSERT INTO remito_lineas (remito_id, producto_id, cantidad) VALUES (?,?,?)', [remId, l.producto_id, l.cantidad])
  }
  return remId
}

describe('Remitos — creación', () => {
  it('crea un remito con número correlativo', () => {
    crearRemito(1, [{ producto_id: 1, cantidad: 5 }])
    const r = getOne<{ numero: string }>(db, 'SELECT numero FROM remitos WHERE id=1')
    expect(r?.numero).toBe('REM-000001')
  })

  it('el segundo remito tiene número siguiente', () => {
    crearRemito(1, [{ producto_id: 1, cantidad: 5 }])
    crearRemito(1, [{ producto_id: 2, cantidad: 3 }])
    const nums = getAll<{ numero: string }>(db, 'SELECT numero FROM remitos ORDER BY id').map(r => r.numero)
    expect(nums).toEqual(['REM-000001', 'REM-000002'])
  })

  it('guarda las líneas correctamente', () => {
    const id = crearRemito(1, [
      { producto_id: 1, cantidad: 10 },
      { producto_id: 2, cantidad: 3 },
    ])
    const lineas = getAll(db, 'SELECT * FROM remito_lineas WHERE remito_id=?', [id])
    expect(lineas).toHaveLength(2)
  })

  it('estado inicial es PENDIENTE', () => {
    crearRemito(1, [{ producto_id: 1, cantidad: 1 }])
    const r = getOne<{ estado: string }>(db, 'SELECT estado FROM remitos LIMIT 1')
    expect(r?.estado).toBe('PENDIENTE')
  })
})

describe('Remitos — cambio de estado', () => {
  it('puede marcarse como ENTREGADO', () => {
    const id = crearRemito(1, [{ producto_id: 1, cantidad: 1 }])
    db.run('UPDATE remitos SET estado=? WHERE id=?', ['ENTREGADO', id])
    const r = getOne<{ estado: string }>(db, 'SELECT estado FROM remitos WHERE id=?', [id])
    expect(r?.estado).toBe('ENTREGADO')
  })

  it('puede anularse', () => {
    const id = crearRemito(1, [{ producto_id: 1, cantidad: 1 }])
    db.run('UPDATE remitos SET estado=? WHERE id=?', ['ANULADO', id])
    const r = getOne<{ estado: string }>(db, 'SELECT estado FROM remitos WHERE id=?', [id])
    expect(r?.estado).toBe('ANULADO')
  })
})
