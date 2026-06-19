import { ipcMain } from 'electron'
import { getAll, getOne, getDb, persistir, siguienteNumero } from '../db/schema'
import type { EstadoFactura, Factura, FacturaLinea } from '../../shared/types'

export function registrarFacturas() {
  ipcMain.handle('facturas:listar', () =>
    getAll<Factura>(`
      SELECT f.*, c.razon_social AS cliente_nombre
      FROM facturas f JOIN clientes c ON c.id = f.cliente_id
      ORDER BY f.creado_en DESC
    `)
  )

  ipcMain.handle('facturas:obtener', (_e, id: number) => {
    const factura = getOne<Factura>(`
      SELECT f.*, c.razon_social AS cliente_nombre
      FROM facturas f JOIN clientes c ON c.id = f.cliente_id WHERE f.id = ?
    `, [id])
    const lineas = getAll<FacturaLinea>(`
      SELECT fl.*, p.codigo AS producto_codigo, p.descripcion AS producto_descripcion
      FROM factura_lineas fl JOIN productos p ON p.id = fl.producto_id
      WHERE fl.factura_id = ?
    `, [id])
    return { factura, lineas }
  })

  ipcMain.handle('facturas:crear', (_e, payload: {
    factura: Omit<Factura, 'id' | 'creado_en' | 'numero'>
    lineas: Omit<FacturaLinea, 'id' | 'factura_id'>[]
  }) => {
    const numero = siguienteNumero('ultimo_nro_factura', 'FACT')
    const db = getDb()
    const f = payload.factura
    db.run(
      'INSERT INTO facturas (numero,presupuesto_id,cliente_id,fecha,vencimiento,estado,subtotal,descuento_extra,total,notas) VALUES (?,?,?,?,?,?,?,?,?,?)',
      [numero, f.presupuesto_id, f.cliente_id, f.fecha, f.vencimiento, f.estado, f.subtotal, f.descuento_extra, f.total, f.notas]
    )
    const factId = (getOne<{ id: number }>('SELECT last_insert_rowid() as id'))!.id
    for (const l of payload.lineas) {
      db.run(
        'INSERT INTO factura_lineas (factura_id,producto_id,cantidad,precio_unitario,descuento,subtotal) VALUES (?,?,?,?,?,?)',
        [factId, l.producto_id, l.cantidad, l.precio_unitario, l.descuento, l.subtotal]
      )
      // Descontar stock
      db.run('UPDATE productos SET stock = stock - ? WHERE id = ?', [l.cantidad, l.producto_id])
    }
    persistir()
    return getOne<Factura>('SELECT * FROM facturas WHERE id = ?', [factId])
  })

  ipcMain.handle('facturas:actualizar-estado', (_e, { id, estado }: { id: number; estado: EstadoFactura }) => {
    getDb().run('UPDATE facturas SET estado = ? WHERE id = ?', [estado, id])
    persistir()
  })
}
