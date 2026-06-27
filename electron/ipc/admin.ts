import { ipcMain } from 'electron'
import { getOne, getDb, persistir } from '../db/schema'
import type { ConfigEmpresa } from '../../shared/types'

const CAMPOS: (keyof ConfigEmpresa)[] = ['razon_social', 'cuit', 'direccion', 'telefono', 'email', 'condicion_iva']

export function registrarAdmin() {
  ipcMain.handle('admin:config-empresa', (): ConfigEmpresa => {
    const get = (clave: string) => getOne<{ valor: string }>('SELECT valor FROM config WHERE clave=?', [clave])?.valor ?? ''
    return {
      razon_social:   get('empresa_razon_social'),
      cuit:           get('empresa_cuit'),
      direccion:      get('empresa_direccion'),
      telefono:       get('empresa_telefono'),
      email:          get('empresa_email'),
      condicion_iva:  get('empresa_condicion_iva'),
    }
  })

  ipcMain.handle('admin:guardar-config-empresa', (_e, cfg: ConfigEmpresa) => {
    const db = getDb()
    for (const campo of CAMPOS) {
      db.run(
        'INSERT INTO config (clave, valor) VALUES (?,?) ON CONFLICT(clave) DO UPDATE SET valor=excluded.valor',
        [`empresa_${campo}`, cfg[campo]]
      )
    }
    persistir()
  })
}
