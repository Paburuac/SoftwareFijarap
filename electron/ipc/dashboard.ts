import { ipcMain } from 'electron'
import { getAll, getOne, getDb, persistir } from '../db/schema'

export function registrarDashboard() {
  ipcMain.handle('dashboard:stats', () => {
    const g = (sql: string) => (getOne<{ c: number }>(sql)?.c ?? 0)
    const v = (sql: string) => (getOne<{ v: number }>(sql)?.v ?? 0)

    const hoy = new Date().toISOString().slice(0, 7)

    const stats = {
      productos_bajo_stock: g('SELECT COUNT(*) as c FROM productos WHERE activo=1 AND stock <= stock_minimo'),
      materias_primas_bajo_stock: g('SELECT COUNT(*) as c FROM materias_primas WHERE activo=1 AND stock <= stock_minimo'),
      presupuestos_pendientes: g("SELECT COUNT(*) as c FROM presupuestos WHERE estado IN ('BORRADOR','ENVIADO')"),
      facturas_pendientes: g("SELECT COUNT(*) as c FROM facturas WHERE estado='PENDIENTE'"),
      facturas_vencidas: g("SELECT COUNT(*) as c FROM facturas WHERE estado='VENCIDA'"),
      ordenes_fabricacion_activas: g("SELECT COUNT(*) as c FROM ordenes_fabricacion WHERE estado IN ('PENDIENTE','EN_PROCESO')"),
      ventas_mes: v(`SELECT COALESCE(SUM(total),0) as v FROM facturas WHERE estado!='ANULADA' AND substr(fecha,1,7)='${hoy}'`),
      notificaciones_sin_leer: g('SELECT COUNT(*) as c FROM notificaciones WHERE leida=0'),
    }

    // Generar notificaciones de stock bajo
    const prods = getAll<{ codigo: string; descripcion: string }>('SELECT codigo, descripcion FROM productos WHERE activo=1 AND stock <= stock_minimo')
    const db = getDb()
    for (const p of prods) {
      const existe = getOne<{ id: number }>('SELECT id FROM notificaciones WHERE tipo=? AND mensaje LIKE ? AND leida=0', ['STOCK_BAJO', `%${p.codigo}%`])
      if (!existe) {
        db.run("INSERT INTO notificaciones (tipo,mensaje) VALUES ('STOCK_BAJO',?)", [`Stock bajo: ${p.codigo} - ${p.descripcion}`])
      }
    }
    persistir()

    return stats
  })

  ipcMain.handle('notificaciones:listar', () =>
    getAll('SELECT * FROM notificaciones ORDER BY leida ASC, creado_en DESC LIMIT 50')
  )

  ipcMain.handle('notificaciones:marcar-leida', (_e, id: number) => {
    getDb().run('UPDATE notificaciones SET leida=1 WHERE id=?', [id])
    persistir()
  })
}
