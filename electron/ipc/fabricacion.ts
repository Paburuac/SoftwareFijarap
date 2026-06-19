import { ipcMain } from 'electron'
import { getAll, getOne, getDb, persistir, siguienteNumero } from '../db/schema'
import type { EtapaFabricacion, OrdenFabricacion, OrdenFabricacionInsumo } from '../../shared/types'

const ETAPAS: EtapaFabricacion[] = ['INYECCION', 'FABRICACION', 'ENVASADO', 'COMPLETADO']

export function registrarFabricacion() {
  ipcMain.handle('fabricacion:listar', () =>
    getAll<OrdenFabricacion>(`
      SELECT of2.*, p.codigo AS producto_codigo, p.descripcion AS producto_descripcion
      FROM ordenes_fabricacion of2 JOIN productos p ON p.id = of2.producto_id
      ORDER BY of2.creado_en DESC
    `)
  )

  ipcMain.handle('fabricacion:obtener', (_e, id: number) => {
    const orden = getOne<OrdenFabricacion>(`
      SELECT of2.*, p.codigo AS producto_codigo, p.descripcion AS producto_descripcion
      FROM ordenes_fabricacion of2 JOIN productos p ON p.id = of2.producto_id WHERE of2.id = ?
    `, [id])
    const insumos = getAll<OrdenFabricacionInsumo>(`
      SELECT ofi.*, mp.descripcion AS materia_prima_descripcion
      FROM orden_fabricacion_insumos ofi JOIN materias_primas mp ON mp.id = ofi.materia_prima_id
      WHERE ofi.orden_fabricacion_id = ?
    `, [id])
    return { orden, insumos }
  })

  ipcMain.handle('fabricacion:crear', (_e, payload: {
    orden: Omit<OrdenFabricacion, 'id' | 'creado_en' | 'numero'>
    insumos: Omit<OrdenFabricacionInsumo, 'id' | 'orden_fabricacion_id'>[]
  }) => {
    const numero = siguienteNumero('ultimo_nro_fabricacion', 'OF')
    const db = getDb()
    const o = payload.orden
    db.run(
      'INSERT INTO ordenes_fabricacion (numero,producto_id,cantidad,etapa,estado,fecha_inicio,fecha_fin,notas) VALUES (?,?,?,?,?,?,?,?)',
      [numero, o.producto_id, o.cantidad, o.etapa, o.estado, o.fecha_inicio, o.fecha_fin, o.notas]
    )
    const ofId = (getOne<{ id: number }>('SELECT last_insert_rowid() as id'))!.id
    for (const ins of payload.insumos) {
      db.run(
        'INSERT INTO orden_fabricacion_insumos (orden_fabricacion_id,materia_prima_id,cantidad_necesaria,cantidad_usada) VALUES (?,?,?,0)',
        [ofId, ins.materia_prima_id, ins.cantidad_necesaria]
      )
    }
    persistir()
    return getOne<OrdenFabricacion>('SELECT * FROM ordenes_fabricacion WHERE id = ?', [ofId])
  })

  ipcMain.handle('fabricacion:avanzar-etapa', (_e, id: number) => {
    const db = getDb()
    const orden = getOne<OrdenFabricacion>('SELECT * FROM ordenes_fabricacion WHERE id = ?', [id])!
    const idxActual = ETAPAS.indexOf(orden.etapa)
    const siguienteEtapa = ETAPAS[idxActual + 1] ?? 'COMPLETADO'

    if (siguienteEtapa === 'COMPLETADO') {
      const insumos = getAll<OrdenFabricacionInsumo>('SELECT * FROM orden_fabricacion_insumos WHERE orden_fabricacion_id = ?', [id])
      for (const ins of insumos) {
        db.run('UPDATE materias_primas SET stock = stock - ? WHERE id = ?', [ins.cantidad_necesaria, ins.materia_prima_id])
        db.run('UPDATE orden_fabricacion_insumos SET cantidad_usada = cantidad_necesaria WHERE id = ?', [ins.id])
      }
      db.run('UPDATE productos SET stock = stock + ? WHERE id = ?', [orden.cantidad, orden.producto_id])
      db.run("UPDATE ordenes_fabricacion SET etapa='COMPLETADO', estado='COMPLETADA', fecha_fin=date('now') WHERE id=?", [id])
    } else {
      db.run("UPDATE ordenes_fabricacion SET etapa=?, estado='EN_PROCESO' WHERE id=?", [siguienteEtapa, id])
    }
    persistir()
    return getOne<OrdenFabricacion>('SELECT * FROM ordenes_fabricacion WHERE id = ?', [id])
  })
}
