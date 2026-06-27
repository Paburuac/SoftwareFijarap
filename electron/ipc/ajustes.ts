import { ipcMain } from 'electron'
import { getAll, getOne, getDb, persistir, siguienteNumero } from '../db/schema'
import type { AjusteInventario, AjusteInventarioLinea } from '../../shared/types'

export function registrarAjustes() {
  ipcMain.handle('ajustes:listar', () =>
    getAll<AjusteInventario>('SELECT * FROM ajustes_inventario ORDER BY creado_en DESC')
  )

  ipcMain.handle('ajustes:obtener', (_e, id: number) => {
    const ajuste = getOne<AjusteInventario>('SELECT * FROM ajustes_inventario WHERE id=?', [id])
    const lineas = getAll<AjusteInventarioLinea>(`
      SELECT al.*, p.codigo AS producto_codigo, p.descripcion AS producto_descripcion
      FROM ajuste_inventario_lineas al JOIN productos p ON p.id = al.producto_id
      WHERE al.ajuste_id=?
    `, [id])
    return { ajuste, lineas }
  })

  ipcMain.handle('ajustes:crear', (_e, payload: {
    ajuste: Omit<AjusteInventario, 'id' | 'creado_en'>
    lineas: { producto_id: number; cantidad_ajuste: number }[]
  }) => {
    const db = getDb()
    const a = payload.ajuste
    db.run(
      'INSERT INTO ajustes_inventario (tipo,motivo,fecha) VALUES (?,?,?)',
      [a.tipo, a.motivo, a.fecha]
    )
    const ajId = (getOne<{ id: number }>('SELECT last_insert_rowid() as id'))!.id

    for (const l of payload.lineas) {
      const prod = getOne<{ stock: number }>('SELECT stock FROM productos WHERE id=?', [l.producto_id])
      const anterior = prod?.stock ?? 0
      let nueva = anterior
      if (a.tipo === 'ENTRADA')    nueva = anterior + l.cantidad_ajuste
      else if (a.tipo === 'SALIDA') nueva = Math.max(0, anterior - l.cantidad_ajuste)
      else                          nueva = l.cantidad_ajuste // CORRECCION = valor absoluto

      db.run(
        'INSERT INTO ajuste_inventario_lineas (ajuste_id,producto_id,cantidad_anterior,cantidad_ajuste,cantidad_nueva) VALUES (?,?,?,?,?)',
        [ajId, l.producto_id, anterior, l.cantidad_ajuste, nueva]
      )
      db.run('UPDATE productos SET stock=? WHERE id=?', [nueva, l.producto_id])
    }

    persistir()
    return getOne<AjusteInventario>('SELECT * FROM ajustes_inventario WHERE id=?', [ajId])
  })
}
