import { ipcMain } from 'electron'
import { getAll, getOne, getDb, persistir } from '../db/schema'
import type { CajaMovimiento, CajaArqueo, CajaResumen } from '../../shared/types'

export function registrarCaja() {
  ipcMain.handle('caja:resumen', (): CajaResumen => {
    const v = (sql: string) => (getOne<{ v: number }>(sql)?.v ?? 0)
    const hoy = new Date().toISOString().slice(0, 10)
    const mes = new Date().toISOString().slice(0, 7)
    return {
      saldo_actual:   v("SELECT COALESCE(SUM(CASE WHEN tipo='INGRESO' THEN monto ELSE -monto END),0) as v FROM caja_movimientos"),
      ingresos_hoy:   v(`SELECT COALESCE(SUM(monto),0) as v FROM caja_movimientos WHERE tipo='INGRESO' AND fecha='${hoy}'`),
      egresos_hoy:    v(`SELECT COALESCE(SUM(monto),0) as v FROM caja_movimientos WHERE tipo='EGRESO' AND fecha='${hoy}'`),
      ingresos_mes:   v(`SELECT COALESCE(SUM(monto),0) as v FROM caja_movimientos WHERE tipo='INGRESO' AND substr(fecha,1,7)='${mes}'`),
      egresos_mes:    v(`SELECT COALESCE(SUM(monto),0) as v FROM caja_movimientos WHERE tipo='EGRESO' AND substr(fecha,1,7)='${mes}'`),
    }
  })

  ipcMain.handle('caja:movimientos', (_e, { desde, hasta }: { desde?: string; hasta?: string }) => {
    let sql = 'SELECT * FROM caja_movimientos WHERE 1=1'
    const params: string[] = []
    if (desde) { sql += ' AND fecha >= ?'; params.push(desde) }
    if (hasta) { sql += ' AND fecha <= ?'; params.push(hasta) }
    sql += ' ORDER BY creado_en DESC LIMIT 200'
    return getAll<CajaMovimiento>(sql, params)
  })

  ipcMain.handle('caja:registrar', (_e, mov: Omit<CajaMovimiento, 'id' | 'creado_en'>) => {
    const db = getDb()
    db.run(
      'INSERT INTO caja_movimientos (tipo, concepto, monto, referencia, fecha) VALUES (?,?,?,?,?)',
      [mov.tipo, mov.concepto, mov.monto, mov.referencia ?? '', mov.fecha]
    )
    const id = (getOne<{ id: number }>('SELECT last_insert_rowid() as id'))!.id
    persistir()
    return getOne<CajaMovimiento>('SELECT * FROM caja_movimientos WHERE id=?', [id])
  })

  ipcMain.handle('caja:eliminar', (_e, id: number) => {
    getDb().run('DELETE FROM caja_movimientos WHERE id=?', [id])
    persistir()
  })

  ipcMain.handle('caja:arqueos', () =>
    getAll<CajaArqueo>('SELECT * FROM caja_arqueos ORDER BY fecha DESC LIMIT 50')
  )

  ipcMain.handle('caja:arquear', (_e, { saldo_real, notas }: { saldo_real: number; notas: string }) => {
    const v = (sql: string) => (getOne<{ v: number }>(sql)?.v ?? 0)
    const saldo_sistema = v("SELECT COALESCE(SUM(CASE WHEN tipo='INGRESO' THEN monto ELSE -monto END),0) as v FROM caja_movimientos")
    const diferencia = saldo_real - saldo_sistema
    const db = getDb()
    db.run(
      'INSERT INTO caja_arqueos (saldo_sistema, saldo_real, diferencia, notas) VALUES (?,?,?,?)',
      [saldo_sistema, saldo_real, diferencia, notas]
    )
    const id = (getOne<{ id: number }>('SELECT last_insert_rowid() as id'))!.id
    persistir()
    return getOne<CajaArqueo>('SELECT * FROM caja_arqueos WHERE id=?', [id])
  })
}
