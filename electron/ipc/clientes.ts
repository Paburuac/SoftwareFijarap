import { ipcMain } from 'electron'
import { getAll, getOne, getDb, persistir } from '../db/schema'
import type { Cliente } from '../../shared/types'

export function registrarClientes() {
  ipcMain.handle('clientes:listar', () =>
    getAll<Cliente>('SELECT * FROM clientes WHERE activo = 1 ORDER BY razon_social')
  )

  ipcMain.handle('clientes:crear', (_e, d: Omit<Cliente, 'id' | 'creado_en'>) => {
    const db = getDb()
    db.run(
      'INSERT INTO clientes (razon_social,cuit,telefono,email,direccion,tipo,descuento) VALUES (?,?,?,?,?,?,?)',
      [d.razon_social, d.cuit, d.telefono, d.email, d.direccion, d.tipo, d.descuento]
    )
    const row = getOne<{ id: number }>('SELECT last_insert_rowid() as id')
    persistir()
    return getOne<Cliente>('SELECT * FROM clientes WHERE id = ?', [row!.id])
  })

  ipcMain.handle('clientes:actualizar', (_e, d: Cliente) => {
    getDb().run(
      'UPDATE clientes SET razon_social=?,cuit=?,telefono=?,email=?,direccion=?,tipo=?,descuento=? WHERE id=?',
      [d.razon_social, d.cuit, d.telefono, d.email, d.direccion, d.tipo, d.descuento, d.id]
    )
    persistir()
    return getOne<Cliente>('SELECT * FROM clientes WHERE id = ?', [d.id])
  })

  ipcMain.handle('clientes:eliminar', (_e, id: number) => {
    getDb().run('UPDATE clientes SET activo = 0 WHERE id = ?', [id])
    persistir()
  })
}
