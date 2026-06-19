import { ipcMain } from 'electron'
import { getAll, getOne, getDb, persistir } from '../db/schema'
import type { Proveedor } from '../../shared/types'

export function registrarProveedores() {
  ipcMain.handle('proveedores:listar', () =>
    getAll<Proveedor>('SELECT * FROM proveedores WHERE activo = 1 ORDER BY razon_social')
  )

  ipcMain.handle('proveedores:crear', (_e, d: Omit<Proveedor, 'id' | 'creado_en'>) => {
    const db = getDb()
    db.run(
      'INSERT INTO proveedores (razon_social,cuit,telefono,email,direccion,condicion_pago) VALUES (?,?,?,?,?,?)',
      [d.razon_social, d.cuit, d.telefono, d.email, d.direccion, d.condicion_pago]
    )
    const row = getOne<{ id: number }>('SELECT last_insert_rowid() as id')
    persistir()
    return getOne<Proveedor>('SELECT * FROM proveedores WHERE id = ?', [row!.id])
  })

  ipcMain.handle('proveedores:actualizar', (_e, d: Proveedor) => {
    getDb().run(
      'UPDATE proveedores SET razon_social=?,cuit=?,telefono=?,email=?,direccion=?,condicion_pago=? WHERE id=?',
      [d.razon_social, d.cuit, d.telefono, d.email, d.direccion, d.condicion_pago, d.id]
    )
    persistir()
    return getOne<Proveedor>('SELECT * FROM proveedores WHERE id = ?', [d.id])
  })

  ipcMain.handle('proveedores:eliminar', (_e, id: number) => {
    getDb().run('UPDATE proveedores SET activo = 0 WHERE id = ?', [id])
    persistir()
  })
}
