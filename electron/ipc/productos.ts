import { ipcMain } from 'electron'
import { getAll, getOne, getDb, persistir } from '../db/schema'
import type { Producto } from '../../shared/types'

export function registrarProductos() {
  ipcMain.handle('productos:listar', () =>
    getAll<Producto>('SELECT * FROM productos WHERE activo = 1 ORDER BY categoria, codigo')
  )

  ipcMain.handle('productos:crear', (_e, d: Omit<Producto, 'id' | 'creado_en'>) => {
    const db = getDb()
    db.run(
      'INSERT INTO productos (codigo,descripcion,categoria,stock,stock_minimo,precio_minorista,precio_mayorista,precio_distribuidora,unidad,imagen) VALUES (?,?,?,?,?,?,?,?,?,?)',
      [d.codigo, d.descripcion, d.categoria, d.stock, d.stock_minimo, d.precio_minorista, d.precio_mayorista, d.precio_distribuidora, d.unidad, d.imagen ?? '']
    )
    const row = getOne<{ id: number }>('SELECT last_insert_rowid() as id')
    persistir()
    return getOne<Producto>('SELECT * FROM productos WHERE id = ?', [row!.id])
  })

  ipcMain.handle('productos:actualizar', (_e, d: Producto) => {
    getDb().run(
      'UPDATE productos SET codigo=?,descripcion=?,categoria=?,stock=?,stock_minimo=?,precio_minorista=?,precio_mayorista=?,precio_distribuidora=?,unidad=?,imagen=? WHERE id=?',
      [d.codigo, d.descripcion, d.categoria, d.stock, d.stock_minimo, d.precio_minorista, d.precio_mayorista, d.precio_distribuidora, d.unidad, d.imagen ?? '', d.id]
    )
    persistir()
    return getOne<Producto>('SELECT * FROM productos WHERE id = ?', [d.id])
  })

  ipcMain.handle('productos:eliminar', (_e, id: number) => {
    getDb().run('UPDATE productos SET activo = 0 WHERE id = ?', [id])
    persistir()
  })
}
