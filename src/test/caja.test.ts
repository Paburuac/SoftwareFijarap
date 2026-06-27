import { describe, it, expect, beforeEach } from 'vitest'
import type { Database } from 'sql.js'
import { crearDbTest, getOne, getAll } from './helpers/db'

let db: Database

beforeEach(async () => { db = await crearDbTest() })

function registrarMovimiento(tipo: 'INGRESO' | 'EGRESO', concepto: string, monto: number, fecha: string) {
  db.run(
    'INSERT INTO caja_movimientos (tipo, concepto, monto, referencia, fecha) VALUES (?,?,?,?,?)',
    [tipo, concepto, monto, '', fecha]
  )
  return getOne<{ id: number }>(db, 'SELECT last_insert_rowid() as id')!.id
}

function calcularSaldo(): number {
  return getOne<{ v: number }>(db, "SELECT COALESCE(SUM(CASE WHEN tipo='INGRESO' THEN monto ELSE -monto END),0) as v FROM caja_movimientos")?.v ?? 0
}

describe('Caja — movimientos', () => {
  it('saldo inicial es 0', () => {
    expect(calcularSaldo()).toBe(0)
  })

  it('un ingreso suma al saldo', () => {
    registrarMovimiento('INGRESO', 'Cobro factura', 5000, '2026-01-01')
    expect(calcularSaldo()).toBe(5000)
  })

  it('un egreso resta al saldo', () => {
    registrarMovimiento('INGRESO', 'Apertura', 10000, '2026-01-01')
    registrarMovimiento('EGRESO', 'Pago proveedor', 3000, '2026-01-01')
    expect(calcularSaldo()).toBe(7000)
  })

  it('múltiples movimientos acumulan correctamente', () => {
    registrarMovimiento('INGRESO', 'A', 1000, '2026-01-01')
    registrarMovimiento('INGRESO', 'B', 2500, '2026-01-01')
    registrarMovimiento('EGRESO', 'C', 800, '2026-01-01')
    expect(calcularSaldo()).toBe(2700)
  })

  it('eliminar un movimiento ajusta el saldo', () => {
    const id = registrarMovimiento('INGRESO', 'Temporal', 500, '2026-01-01')
    registrarMovimiento('INGRESO', 'Fijo', 1000, '2026-01-01')
    db.run('DELETE FROM caja_movimientos WHERE id=?', [id])
    expect(calcularSaldo()).toBe(1000)
  })
})

describe('Caja — arqueos', () => {
  it('registra arqueo con diferencia correcta', () => {
    registrarMovimiento('INGRESO', 'Cobro', 10000, '2026-01-01')
    const saldo_sistema = calcularSaldo()
    const saldo_real = 9800
    const diferencia = saldo_real - saldo_sistema
    db.run(
      'INSERT INTO caja_arqueos (saldo_sistema, saldo_real, diferencia, notas) VALUES (?,?,?,?)',
      [saldo_sistema, saldo_real, diferencia, 'Faltante detectado']
    )
    const arqueo = getOne<{ diferencia: number; saldo_sistema: number }>(db, 'SELECT * FROM caja_arqueos ORDER BY id DESC LIMIT 1')
    expect(arqueo?.saldo_sistema).toBe(10000)
    expect(arqueo?.diferencia).toBe(-200)
  })

  it('arqueo sin diferencia cuando los saldos coinciden', () => {
    registrarMovimiento('INGRESO', 'Cobro', 5000, '2026-01-01')
    const saldo = calcularSaldo()
    db.run(
      'INSERT INTO caja_arqueos (saldo_sistema, saldo_real, diferencia, notas) VALUES (?,?,?,?)',
      [saldo, saldo, 0, '']
    )
    const arqueo = getOne<{ diferencia: number }>(db, 'SELECT * FROM caja_arqueos ORDER BY id DESC LIMIT 1')
    expect(arqueo?.diferencia).toBe(0)
  })
})

describe('Caja — filtro por período', () => {
  it('filtra movimientos por fecha', () => {
    registrarMovimiento('INGRESO', 'Enero', 1000, '2026-01-15')
    registrarMovimiento('INGRESO', 'Febrero', 2000, '2026-02-10')
    registrarMovimiento('EGRESO', 'Marzo', 500, '2026-03-05')

    const enero = getAll(db, "SELECT * FROM caja_movimientos WHERE fecha BETWEEN '2026-01-01' AND '2026-01-31'")
    expect(enero).toHaveLength(1)

    const q1 = getAll(db, "SELECT * FROM caja_movimientos WHERE fecha BETWEEN '2026-01-01' AND '2026-03-31'")
    expect(q1).toHaveLength(3)
  })
})
