import { useEffect, useState } from 'react'
import { invoke } from '../api'
import type { ConfigEmpresa } from '../../shared/types'
import PageHeader from '../components/PageHeader'
import { Settings, Save } from 'lucide-react'

const CONDICIONES_IVA = [
  'Responsable Inscripto',
  'Monotributista',
  'Exento',
  'Consumidor Final',
  'No Responsable',
]

export default function Administracion() {
  const [cfg, setCfg] = useState<ConfigEmpresa>({
    razon_social: '', cuit: '', direccion: '', telefono: '', email: '', condicion_iva: 'Responsable Inscripto',
  })
  const [guardado, setGuardado] = useState(false)

  useEffect(() => {
    invoke<ConfigEmpresa>('admin:config-empresa').then(c => setCfg(c))
  }, [])

  const set = (k: keyof ConfigEmpresa) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setCfg(prev => ({ ...prev, [k]: e.target.value }))

  const guardar = async () => {
    await invoke('admin:guardar-config-empresa', cfg)
    setGuardado(true)
    setTimeout(() => setGuardado(false), 2500)
  }

  return (
    <div className="p-6">
      <PageHeader title="Administración" subtitle="Configuración general del sistema">
        <button onClick={guardar} className="btn btn-primary flex items-center gap-2">
          <Save size={16} /> Guardar cambios
        </button>
      </PageHeader>

      {guardado && (
        <div className="bg-green-900/30 border border-green-700 text-green-400 rounded-lg px-4 py-2 text-sm mb-6">
          Configuración guardada correctamente.
        </div>
      )}

      <div className="max-w-2xl">
        <div className="card mb-6">
          <h2 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
            <Settings size={15} /> Datos de la empresa
          </h2>
          <div className="space-y-4">
            <div>
              <label className="label">Razón social</label>
              <input className="input" value={cfg.razon_social} onChange={set('razon_social')} placeholder="Ej: Fijarap S.R.L." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">CUIT</label>
                <input className="input" value={cfg.cuit} onChange={set('cuit')} placeholder="XX-XXXXXXXX-X" />
              </div>
              <div>
                <label className="label">Condición IVA</label>
                <select className="input" value={cfg.condicion_iva} onChange={set('condicion_iva')}>
                  {CONDICIONES_IVA.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="label">Dirección</label>
              <input className="input" value={cfg.direccion} onChange={set('direccion')} placeholder="Calle, número, ciudad" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Teléfono</label>
                <input className="input" value={cfg.telefono} onChange={set('telefono')} placeholder="+54 11 XXXX-XXXX" />
              </div>
              <div>
                <label className="label">Email</label>
                <input type="email" className="input" value={cfg.email} onChange={set('email')} placeholder="info@empresa.com" />
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="text-sm font-semibold text-gray-300 mb-3">Información del sistema</h2>
          <div className="space-y-2 text-sm text-gray-400">
            <div className="flex justify-between">
              <span>Versión</span>
              <span className="text-gray-300">1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span>Base de datos</span>
              <span className="text-gray-300">SQLite (sql.js)</span>
            </div>
            <div className="flex justify-between">
              <span>Motor</span>
              <span className="text-gray-300">Electron + React + TypeScript</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
