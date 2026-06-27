import { ipcMain } from 'electron'
import { getAll, getOne, getDb, persistir } from '../db/schema'
import type { MateriaPrima } from '../../shared/types'

export function registrarMateriasPrimas() {
  ipcMain.handle('materias-primas:listar', () =>
    getAll<MateriaPrima>('SELECT * FROM materias_primas WHERE activo = 1 ORDER BY descripcion')
  )

  ipcMain.handle('materias-primas:crear', (_e, d: Omit<MateriaPrima, 'id' | 'creado_en'>) => {
    const db = getDb()
    db.run(
      'INSERT INTO materias_primas (codigo,descripcion,unidad,stock,stock_minimo,precio_referencia,imagen) VALUES (?,?,?,?,?,?,?)',
      [d.codigo, d.descripcion, d.unidad, d.stock, d.stock_minimo, d.precio_referencia, d.imagen ?? '']
    )
    const row = getOne<{ id: number }>('SELECT last_insert_rowid() as id')
    persistir()
    return getOne<MateriaPrima>('SELECT * FROM materias_primas WHERE id = ?', [row!.id])
  })

  ipcMain.handle('materias-primas:actualizar', (_e, d: MateriaPrima) => {
    getDb().run(
      'UPDATE materias_primas SET codigo=?,descripcion=?,unidad=?,stock=?,stock_minimo=?,precio_referencia=?,imagen=? WHERE id=?',
      [d.codigo, d.descripcion, d.unidad, d.stock, d.stock_minimo, d.precio_referencia, d.imagen ?? '', d.id]
    )
    persistir()
    return getOne<MateriaPrima>('SELECT * FROM materias_primas WHERE id = ?', [d.id])
  })

  ipcMain.handle('materias-primas:eliminar', (_e, id: number) => {
    getDb().run('UPDATE materias_primas SET activo = 0 WHERE id = ?', [id])
    persistir()
  })
}
