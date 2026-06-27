import { ipcMain } from 'electron'
import { getAll, getOne } from '../db/schema'
import type { ReporteStockItem, ReporteDeudaCliente, ReporteMovimientoCaja, Factura } from '../../shared/types'

export function registrarReportes() {
  ipcMain.handle('reportes:stock', (): ReporteStockItem[] =>
    getAll<ReporteStockItem>(`
      SELECT id, codigo, descripcion, categoria, stock, stock_minimo,
             precio_minorista, precio_mayorista, precio_distribuidora
      FROM productos WHERE activo=1
      ORDER BY categoria, descripcion
    `)
  )

  ipcMain.handle('reportes:deuda-clientes', (): ReporteDeudaCliente[] =>
    getAll<ReporteDeudaCliente>(`
      SELECT f.cliente_id,
             c.razon_social,
             c.tipo,
             COALESCE(SUM(f.total),0) as total_deuda,
             COUNT(*) as facturas_pendientes
      FROM facturas f
      JOIN clientes c ON c.id = f.cliente_id
      WHERE f.estado IN ('PENDIENTE','VENCIDA')
      GROUP BY f.cliente_id
      ORDER BY total_deuda DESC
    `)
  )

  ipcMain.handle('reportes:caja-periodo', (_e, { desde, hasta }: { desde: string; hasta: string }): ReporteMovimientoCaja[] =>
    getAll<ReporteMovimientoCaja>(`
      SELECT fecha,
             COALESCE(SUM(CASE WHEN tipo='INGRESO' THEN monto ELSE 0 END),0) as ingresos,
             COALESCE(SUM(CASE WHEN tipo='EGRESO'  THEN monto ELSE 0 END),0) as egresos,
             COALESCE(SUM(CASE WHEN tipo='INGRESO' THEN monto ELSE -monto END),0) as saldo_dia
      FROM caja_movimientos
      WHERE fecha BETWEEN ? AND ?
      GROUP BY fecha
      ORDER BY fecha ASC
    `, [desde, hasta])
  )

  ipcMain.handle('reportes:ventas-periodo', (_e, { desde, hasta }: { desde: string; hasta: string }) => {
    const facturas = getAll<Factura>(`
      SELECT f.*, c.razon_social AS cliente_nombre
      FROM facturas f JOIN clientes c ON c.id = f.cliente_id
      WHERE f.estado != 'ANULADA' AND f.fecha BETWEEN ? AND ?
      ORDER BY f.fecha DESC
    `, [desde, hasta])
    const total = facturas.reduce((s, f) => s + f.total, 0)
    return { facturas, total }
  })
}
