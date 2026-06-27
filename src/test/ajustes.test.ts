import { describe, it, expect, beforeEach } from 'vitest'
import type { Database } from 'sql.js'
import { crearDbTest, getOne, getAll } from './helpers/db'

let db: Database

beforeEach(async () => {
  db = await crearDbTest()
  db.run("INSERT INTO productos (codigo, descripcion, categoria, stock, stock_minimo) VALUES ('P001','Producto A','FRO',100,10)")
  db.run("INSERT INTO productos (codigo, descripcion, categoria, stock, stock_minimo) VALUES ('P002','Producto B','CR',50,5)")
})

function crearAjuste(tipo: 'ENTRADA' | 'SALIDA' | 'CORRECCION', motivo: string, lineas: { producto_id: number; cantidad: number }[]) {
  db.run("INSERT INTO ajustes_inventario (tipo, motivo, fecha) VALUES (?,?,'2026-01-01')", [tipo, motivo])
  const ajId = getOne<{ id: number }>(db, 'SELECT last_insert_rowid() as id')!.id

  for (const l of lineas) {
    const prod = getOne<{ stock: number }>(db, 'SELECT stock FROM productos WHERE id=?', [l.producto_id])!
    const anterior = prod.stock
    let nueva = anterior
    if (tipo === 'ENTRADA')     nueva = anterior + l.cantidad
    else if (tipo === 'SALIDA') nueva = Math.max(0, anterior - l.cantidad)
    else                         nueva = l.cantidad

    db.run(
      'INSERT INTO ajuste_inventario_lineas (ajuste_id,producto_id,cantidad_anterior,cantidad_ajuste,cantidad_nueva) VALUES (?,?,?,?,?)',
      [ajId, l.producto_id, anterior, l.cantidad, nueva]
    )
    db.run('UPDATE productos SET stock=? WHERE id=?', [nueva, l.producto_id])
  }
  return ajId
}

function stockDe(id: number): number {
  return getOne<{ stock: number }>(db, 'SELECT stock FROM productos WHERE id=?', [id])?.stock ?? 0
}

describe('Ajustes de inventario — ENTRADA', () => {
  it('suma stock al producto', () => {
    crearAjuste('ENTRADA', 'Recepción mercadería', [{ producto_id: 1, cantidad: 50 }])
    expect(stockDe(1)).toBe(150)
  })

  it('múltiples productos en un ajuste', () => {
    crearAjuste('ENTRADA', 'Recepción', [{ producto_id: 1, cantidad: 20 }, { producto_id: 2, cantidad: 10 }])
    expect(stockDe(1)).toBe(120)
    expect(stockDe(2)).toBe(60)
  })
})

describe('Ajustes de inventario — SALIDA', () => {
  it('resta stock al producto', () => {
    crearAjuste('SALIDA', 'Merma', [{ producto_id: 1, cantidad: 30 }])
    expect(stockDe(1)).toBe(70)
  })

  it('no deja el stock en negativo', () => {
    crearAjuste('SALIDA', 'Pérdida total', [{ producto_id: 2, cantidad: 999 }])
    expect(stockDe(2)).toBe(0)
  })
})

describe('Ajustes de inventario — CORRECCION', () => {
  it('establece el stock en el valor exacto indicado', () => {
    crearAjuste('CORRECCION', 'Inventario físico', [{ producto_id: 1, cantidad: 75 }])
    expect(stockDe(1)).toBe(75)
  })

  it('puede corregir a cero', () => {
    crearAjuste('CORRECCION', 'Inventario', [{ producto_id: 1, cantidad: 0 }])
    expect(stockDe(1)).toBe(0)
  })
})

describe('Ajustes de inventario — historial', () => {
  it('guarda el historial con cantidades anterior y nueva', () => {
    crearAjuste('ENTRADA', 'Test', [{ producto_id: 1, cantidad: 10 }])
    const linea = getOne<{ cantidad_anterior: number; cantidad_nueva: number }>(
      db, 'SELECT * FROM ajuste_inventario_lineas LIMIT 1'
    )
    expect(linea?.cantidad_anterior).toBe(100)
    expect(linea?.cantidad_nueva).toBe(110)
  })
})
