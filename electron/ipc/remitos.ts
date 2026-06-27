import { ipcMain } from 'electron'
import { getAll, getOne, getDb, persistir, siguienteNumero } from '../db/schema'
import type { EstadoRemito, Remito, RemitoLinea } from '../../shared/types'

export function registrarRemitos() {
  ipcMain.handle('remitos:listar', () =>
    getAll<Remito>(`
      SELECT r.*, c.razon_social AS cliente_nombre
      FROM remitos r JOIN clientes c ON c.id = r.cliente_id
      ORDER BY r.creado_en DESC
    `)
  )

  ipcMain.handle('remitos:obtener', (_e, id: number) => {
    const remito = getOne<Remito>(`
      SELECT r.*, c.razon_social AS cliente_nombre
      FROM remitos r JOIN clientes c ON c.id = r.cliente_id WHERE r.id=?
    `, [id])
    const lineas = getAll<RemitoLinea>(`
      SELECT rl.*, p.codigo AS producto_codigo, p.descripcion AS producto_descripcion
      FROM remito_lineas rl JOIN productos p ON p.id = rl.producto_id
      WHERE rl.remito_id=?
    `, [id])
    return { remito, lineas }
  })

  ipcMain.handle('remitos:crear', (_e, payload: {
    remito: Omit<Remito, 'id' | 'creado_en' | 'numero'>
    lineas: Omit<RemitoLinea, 'id' | 'remito_id'>[]
  }) => {
    const numero = siguienteNumero('ultimo_nro_remito', 'REM')
    const db = getDb()
    const r = payload.remito
    db.run(
      'INSERT INTO remitos (numero,factura_id,cliente_id,fecha,estado,notas) VALUES (?,?,?,?,?,?)',
      [numero, r.factura_id, r.cliente_id, r.fecha, r.estado, r.notas]
    )
    const remId = (getOne<{ id: number }>('SELECT last_insert_rowid() as id'))!.id
    for (const l of payload.lineas) {
      db.run(
        'INSERT INTO remito_lineas (remito_id,producto_id,cantidad) VALUES (?,?,?)',
        [remId, l.producto_id, l.cantidad]
      )
    }
    persistir()
    return getOne<Remito>('SELECT * FROM remitos WHERE id=?', [remId])
  })

  ipcMain.handle('remitos:actualizar-estado', (_e, { id, estado }: { id: number; estado: EstadoRemito }) => {
    getDb().run('UPDATE remitos SET estado=? WHERE id=?', [estado, id])
    persistir()
  })
}
