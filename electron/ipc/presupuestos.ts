import { ipcMain } from 'electron'
import { getAll, getOne, getDb, persistir, siguienteNumero } from '../db/schema'
import type { EstadoPresupuesto, Presupuesto, PresupuestoLinea } from '../../shared/types'

export function registrarPresupuestos() {
  ipcMain.handle('presupuestos:listar', () =>
    getAll<Presupuesto>(`
      SELECT p.*, c.razon_social AS cliente_nombre
      FROM presupuestos p JOIN clientes c ON c.id = p.cliente_id
      ORDER BY p.creado_en DESC
    `)
  )

  ipcMain.handle('presupuestos:obtener', (_e, id: number) => {
    const presupuesto = getOne<Presupuesto>(`
      SELECT p.*, c.razon_social AS cliente_nombre
      FROM presupuestos p JOIN clientes c ON c.id = p.cliente_id WHERE p.id = ?
    `, [id])
    const lineas = getAll<PresupuestoLinea>(`
      SELECT pl.*, pr.codigo AS producto_codigo, pr.descripcion AS producto_descripcion
      FROM presupuesto_lineas pl JOIN productos pr ON pr.id = pl.producto_id
      WHERE pl.presupuesto_id = ?
    `, [id])
    return { presupuesto, lineas }
  })

  ipcMain.handle('presupuestos:crear', (_e, payload: {
    presupuesto: Omit<Presupuesto, 'id' | 'creado_en' | 'numero'>
    lineas: Omit<PresupuestoLinea, 'id' | 'presupuesto_id'>[]
  }) => {
    const numero = siguienteNumero('ultimo_nro_presupuesto', 'PRES')
    const db = getDb()
    const p = payload.presupuesto
    db.run(
      'INSERT INTO presupuestos (numero,cliente_id,fecha,validez_dias,estado,subtotal,descuento_extra,total,notas) VALUES (?,?,?,?,?,?,?,?,?)',
      [numero, p.cliente_id, p.fecha, p.validez_dias, p.estado, p.subtotal, p.descuento_extra, p.total, p.notas]
    )
    const presId = (getOne<{ id: number }>('SELECT last_insert_rowid() as id'))!.id
    for (const l of payload.lineas) {
      db.run(
        'INSERT INTO presupuesto_lineas (presupuesto_id,producto_id,cantidad,precio_unitario,descuento,subtotal) VALUES (?,?,?,?,?,?)',
        [presId, l.producto_id, l.cantidad, l.precio_unitario, l.descuento, l.subtotal]
      )
    }
    persistir()
    return getOne<Presupuesto>('SELECT * FROM presupuestos WHERE id = ?', [presId])
  })

  ipcMain.handle('presupuestos:actualizar-estado', (_e, { id, estado }: { id: number; estado: EstadoPresupuesto }) => {
    getDb().run('UPDATE presupuestos SET estado = ? WHERE id = ?', [estado, id])
    persistir()
  })
}
