import { ipcMain } from 'electron'
import { getAll, getOne, getDb, persistir, siguienteNumero } from '../db/schema'
import type { OrdenCompra, OrdenCompraLinea } from '../../shared/types'

export function registrarOrdenesCompra() {
  ipcMain.handle('ordenes-compra:listar', () =>
    getAll<OrdenCompra>(`
      SELECT oc.*, p.razon_social AS proveedor_nombre
      FROM ordenes_compra oc JOIN proveedores p ON p.id = oc.proveedor_id
      ORDER BY oc.creado_en DESC
    `)
  )

  ipcMain.handle('ordenes-compra:obtener', (_e, id: number) => {
    const orden = getOne<OrdenCompra>(`
      SELECT oc.*, p.razon_social AS proveedor_nombre
      FROM ordenes_compra oc JOIN proveedores p ON p.id = oc.proveedor_id WHERE oc.id = ?
    `, [id])
    const lineas = getAll<OrdenCompraLinea>(`
      SELECT ocl.*, mp.descripcion AS materia_prima_descripcion
      FROM orden_compra_lineas ocl JOIN materias_primas mp ON mp.id = ocl.materia_prima_id
      WHERE ocl.orden_compra_id = ?
    `, [id])
    return { orden, lineas }
  })

  ipcMain.handle('ordenes-compra:crear', (_e, payload: {
    orden: Omit<OrdenCompra, 'id' | 'creado_en' | 'numero'>
    lineas: Omit<OrdenCompraLinea, 'id' | 'orden_compra_id'>[]
  }) => {
    const numero = siguienteNumero('ultimo_nro_orden_compra', 'OC')
    const db = getDb()
    const o = payload.orden
    db.run(
      'INSERT INTO ordenes_compra (numero,proveedor_id,fecha,estado,total,notas) VALUES (?,?,?,?,?,?)',
      [numero, o.proveedor_id, o.fecha, o.estado, o.total, o.notas]
    )
    const ocId = (getOne<{ id: number }>('SELECT last_insert_rowid() as id'))!.id
    for (const l of payload.lineas) {
      db.run(
        'INSERT INTO orden_compra_lineas (orden_compra_id,materia_prima_id,cantidad,precio_unitario,subtotal) VALUES (?,?,?,?,?)',
        [ocId, l.materia_prima_id, l.cantidad, l.precio_unitario, l.subtotal]
      )
    }
    persistir()
    return getOne<OrdenCompra>('SELECT * FROM ordenes_compra WHERE id = ?', [ocId])
  })

  ipcMain.handle('ordenes-compra:recibir', (_e, id: number) => {
    const db = getDb()
    db.run("UPDATE ordenes_compra SET estado = 'RECIBIDA' WHERE id = ?", [id])
    const lineas = getAll<OrdenCompraLinea>('SELECT * FROM orden_compra_lineas WHERE orden_compra_id = ?', [id])
    for (const l of lineas) {
      db.run('UPDATE materias_primas SET stock = stock + ? WHERE id = ?', [l.cantidad, l.materia_prima_id])
    }
    persistir()
  })
}
