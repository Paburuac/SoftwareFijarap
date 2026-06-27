import { describe, it, expect, beforeEach } from 'vitest'
import type { Database } from 'sql.js'
import { crearDbTest, getOne } from './helpers/db'

let db: Database

beforeEach(async () => { db = await crearDbTest() })

const CAMPOS = ['razon_social', 'cuit', 'direccion', 'telefono', 'email', 'condicion_iva'] as const

function guardarConfig(cfg: Record<string, string>) {
  for (const campo of CAMPOS) {
    db.run(
      'INSERT INTO config (clave, valor) VALUES (?,?) ON CONFLICT(clave) DO UPDATE SET valor=excluded.valor',
      [`empresa_${campo}`, cfg[campo] ?? '']
    )
  }
}

function leerConfig(): Record<string, string> {
  const result: Record<string, string> = {}
  for (const campo of CAMPOS) {
    result[campo] = getOne<{ valor: string }>(db, 'SELECT valor FROM config WHERE clave=?', [`empresa_${campo}`])?.valor ?? ''
  }
  return result
}

describe('Administración — configuración empresa', () => {
  it('guarda y recupera la configuración', () => {
    guardarConfig({
      razon_social: 'Fijarap S.R.L.',
      cuit: '30-12345678-9',
      direccion: 'Av. Test 123',
      telefono: '011-4444-5555',
      email: 'info@fijarap.com',
      condicion_iva: 'Responsable Inscripto',
    })
    const cfg = leerConfig()
    expect(cfg.razon_social).toBe('Fijarap S.R.L.')
    expect(cfg.cuit).toBe('30-12345678-9')
    expect(cfg.condicion_iva).toBe('Responsable Inscripto')
  })

  it('actualiza sin crear duplicados', () => {
    guardarConfig({ razon_social: 'Nombre Viejo', cuit: '', direccion: '', telefono: '', email: '', condicion_iva: '' })
    guardarConfig({ razon_social: 'Nombre Nuevo', cuit: '', direccion: '', telefono: '', email: '', condicion_iva: '' })

    const filas = db.exec("SELECT COUNT(*) as c FROM config WHERE clave='empresa_razon_social'")
    const count = filas[0]?.values[0]?.[0]
    expect(count).toBe(1)

    expect(leerConfig().razon_social).toBe('Nombre Nuevo')
  })

  it('valor vacío por defecto si no se configuró', () => {
    const cfg = leerConfig()
    expect(cfg.razon_social).toBe('')
    expect(cfg.email).toBe('')
  })
})
