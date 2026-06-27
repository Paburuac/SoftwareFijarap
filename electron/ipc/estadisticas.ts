import { ipcMain } from 'electron'
import { getAll, getOne } from '../db/schema'
import type { EstadisticasGenerales, VentaMensual, ProductoTop, ClienteTop } from '../../shared/types'

export function registrarEstadisticas() {
  ipcMain.handle('estadisticas:generales', (): EstadisticasGenerales => {
    const v = (sql: string) => (getOne<{ v: number }>(sql)?.v ?? 0)
    const anio = new Date().toISOString().slice(0, 4)
    const mes  = new Date().toISOString().slice(0, 7)
    return {
      ventas_anio:              v(`SELECT COALESCE(SUM(total),0) as v FROM facturas WHERE estado!='ANULADA' AND substr(fecha,1,4)='${anio}'`),
      ventas_mes:               v(`SELECT COALESCE(SUM(total),0) as v FROM facturas WHERE estado!='ANULADA' AND substr(fecha,1,7)='${mes}'`),
      ticket_promedio:          v(`SELECT COALESCE(AVG(total),0) as v FROM facturas WHERE estado!='ANULADA' AND substr(fecha,1,7)='${mes}'`),
      total_clientes_activos:   v("SELECT COUNT(*) as v FROM clientes WHERE activo=1"),
      total_productos_activos:  v("SELECT COUNT(*) as v FROM productos WHERE activo=1"),
      facturas_pagadas_mes:     v(`SELECT COUNT(*) as v FROM facturas WHERE estado='PAGADA' AND substr(fecha,1,7)='${mes}'`),
      facturas_pendientes_mes:  v(`SELECT COUNT(*) as v FROM facturas WHERE estado='PENDIENTE' AND substr(fecha,1,7)='${mes}'`),
    }
  })

  ipcMain.handle('estadisticas:ventas-mensuales', (_e, { meses }: { meses: number }): VentaMensual[] => {
    const rows = getAll<{ mes: string; total: number; cantidad: number }>(`
      SELECT substr(fecha,1,7) as mes,
             COALESCE(SUM(total),0) as total,
             COUNT(*) as cantidad
      FROM facturas
      WHERE estado != 'ANULADA'
        AND fecha >= date('now', '-${meses} months')
      GROUP BY substr(fecha,1,7)
      ORDER BY mes ASC
    `)
    return rows
  })

  ipcMain.handle('estadisticas:productos-top', (_e, { limite }: { limite: number }): ProductoTop[] =>
    getAll<ProductoTop>(`
      SELECT fl.producto_id,
             p.codigo,
             p.descripcion,
             COALESCE(SUM(fl.subtotal),0) as total_vendido,
             COALESCE(SUM(fl.cantidad),0) as cantidad_vendida
      FROM factura_lineas fl
      JOIN productos p ON p.id = fl.producto_id
      JOIN facturas f  ON f.id = fl.factura_id
      WHERE f.estado != 'ANULADA'
      GROUP BY fl.producto_id
      ORDER BY total_vendido DESC
      LIMIT ${limite}
    `)
  )

  ipcMain.handle('estadisticas:clientes-top', (_e, { limite }: { limite: number }): ClienteTop[] =>
    getAll<ClienteTop>(`
      SELECT f.cliente_id,
             c.razon_social,
             COALESCE(SUM(f.total),0) as total_comprado,
             COUNT(*) as cantidad_facturas
      FROM facturas f
      JOIN clientes c ON c.id = f.cliente_id
      WHERE f.estado != 'ANULADA'
      GROUP BY f.cliente_id
      ORDER BY total_comprado DESC
      LIMIT ${limite}
    `)
  )
}
