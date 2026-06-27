import { useEffect, useState } from 'react'
import { invoke } from '../api'
import type { CajaMovimiento, CajaResumen, CajaArqueo, TipoMovimiento } from '../../shared/types'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'
import EmptyState from '../components/EmptyState'
import { Plus, TrendingUp, TrendingDown, Wallet, ClipboardCheck, Trash2 } from 'lucide-react'

const fmt = (n: number) => n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 })
const hoy = () => new Date().toISOString().slice(0, 10)
const mes1 = () => { const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10) }

export default function Caja() {
  const [resumen, setResumen] = useState<CajaResumen | null>(null)
  const [movimientos, setMovimientos] = useState<CajaMovimiento[]>([])
  const [arqueos, setArqueos] = useState<CajaArqueo[]>([])
  const [tab, setTab] = useState<'movimientos' | 'arqueos'>('movimientos')
  const [desde, setDesde] = useState(mes1())
  const [hasta, setHasta] = useState(hoy())

  // modal nuevo movimiento
  const [modalMov, setModalMov] = useState(false)
  const [tipo, setTipo] = useState<TipoMovimiento>('INGRESO')
  const [concepto, setConcepto] = useState('')
  const [monto, setMonto] = useState('')
  const [referencia, setReferencia] = useState('')
  const [fecha, setFecha] = useState(hoy())

  // modal arqueo
  const [modalArqueo, setModalArqueo] = useState(false)
  const [saldoReal, setSaldoReal] = useState('')
  const [notasArqueo, setNotasArqueo] = useState('')

  const cargar = () => {
    invoke<CajaResumen>('caja:resumen').then(setResumen)
    invoke<CajaMovimiento[]>('caja:movimientos', { desde, hasta }).then(setMovimientos)
    invoke<CajaArqueo[]>('caja:arqueos').then(setArqueos)
  }

  useEffect(() => { cargar() }, [desde, hasta])

  const resetMov = () => {
    setTipo('INGRESO'); setConcepto(''); setMonto(''); setReferencia(''); setFecha(hoy())
  }

  const guardarMov = async () => {
    if (!concepto.trim() || !monto || +monto <= 0) return
    await invoke('caja:registrar', { tipo, concepto: concepto.trim(), monto: +monto, referencia: referencia.trim(), fecha })
    setModalMov(false)
    resetMov()
    cargar()
  }

  const eliminarMov = async (id: number) => {
    if (!confirm('¿Eliminar este movimiento?')) return
    await invoke('caja:eliminar', id)
    cargar()
  }

  const guardarArqueo = async () => {
    if (!saldoReal || +saldoReal < 0) return
    await invoke('caja:arquear', { saldo_real: +saldoReal, notas: notasArqueo.trim() })
    setModalArqueo(false)
    setSaldoReal(''); setNotasArqueo('')
    cargar()
  }

  return (
    <div className="p-6">
      <PageHeader title="Caja" subtitle="Movimientos e ingresos/egresos de dinero">
        <button onClick={() => { setModalArqueo(true) }} className="btn btn-secondary flex items-center gap-2">
          <ClipboardCheck size={16} /> Arqueo
        </button>
        <button onClick={() => setModalMov(true)} className="btn btn-primary flex items-center gap-2">
          <Plus size={16} /> Nuevo movimiento
        </button>
      </PageHeader>

      {/* Tarjetas resumen */}
      {resumen && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="card p-4 col-span-2 lg:col-span-1 border-l-4 border-primary-500">
            <div className="flex items-center gap-2 text-gray-400 text-xs mb-1"><Wallet size={14} /> Saldo actual</div>
            <div className={`text-2xl font-bold ${resumen.saldo_actual >= 0 ? 'text-green-400' : 'text-red-400'}`}>{fmt(resumen.saldo_actual)}</div>
          </div>
          <div className="card p-4 border-l-4 border-green-500">
            <div className="flex items-center gap-2 text-gray-400 text-xs mb-1"><TrendingUp size={14} /> Ingresos hoy</div>
            <div className="text-xl font-semibold text-green-400">{fmt(resumen.ingresos_hoy)}</div>
          </div>
          <div className="card p-4 border-l-4 border-red-500">
            <div className="flex items-center gap-2 text-gray-400 text-xs mb-1"><TrendingDown size={14} /> Egresos hoy</div>
            <div className="text-xl font-semibold text-red-400">{fmt(resumen.egresos_hoy)}</div>
          </div>
          <div className="card p-4">
            <div className="text-gray-400 text-xs mb-1">Ingresos del mes</div>
            <div className="text-xl font-semibold text-green-400">{fmt(resumen.ingresos_mes)}</div>
          </div>
          <div className="card p-4">
            <div className="text-gray-400 text-xs mb-1">Egresos del mes</div>
            <div className="text-xl font-semibold text-red-400">{fmt(resumen.egresos_mes)}</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-4 border-b border-gray-800">
        {(['movimientos', 'arqueos'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${tab === t ? 'border-primary-500 text-primary-400' : 'border-transparent text-gray-400 hover:text-gray-200'}`}>
            {t === 'movimientos' ? 'Movimientos' : 'Historial de arqueos'}
          </button>
        ))}
      </div>

      {tab === 'movimientos' && (
        <>
          {/* Filtro fechas */}
          <div className="flex gap-3 mb-4 items-end">
            <div>
              <label className="label">Desde</label>
              <input type="date" className="input" value={desde} onChange={e => setDesde(e.target.value)} />
            </div>
            <div>
              <label className="label">Hasta</label>
              <input type="date" className="input" value={hasta} onChange={e => setHasta(e.target.value)} />
            </div>
          </div>

          {movimientos.length === 0 ? (
            <EmptyState icon={Wallet} title="Sin movimientos" description="Registrá el primer movimiento de caja." />
          ) : (
            <div className="card overflow-hidden">
              <table className="table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>Concepto</th>
                    <th>Referencia</th>
                    <th className="text-right">Monto</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {movimientos.map(m => (
                    <tr key={m.id}>
                      <td className="text-gray-400 text-sm">{m.fecha}</td>
                      <td>
                        <span className={`badge ${m.tipo === 'INGRESO' ? 'badge-green' : 'badge-red'}`}>{m.tipo}</span>
                      </td>
                      <td className="font-medium">{m.concepto}</td>
                      <td className="text-gray-400 text-sm">{m.referencia || '—'}</td>
                      <td className={`text-right font-semibold ${m.tipo === 'INGRESO' ? 'text-green-400' : 'text-red-400'}`}>
                        {m.tipo === 'EGRESO' ? '-' : ''}{fmt(m.monto)}
                      </td>
                      <td>
                        <button onClick={() => eliminarMov(m.id)} className="btn-icon text-gray-500 hover:text-red-400">
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tab === 'arqueos' && (
        arqueos.length === 0 ? (
          <EmptyState icon={ClipboardCheck} title="Sin arqueos" description="Realizá el primer arqueo de caja." />
        ) : (
          <div className="card overflow-hidden">
            <table className="table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th className="text-right">Saldo sistema</th>
                  <th className="text-right">Saldo real</th>
                  <th className="text-right">Diferencia</th>
                  <th>Notas</th>
                </tr>
              </thead>
              <tbody>
                {arqueos.map(a => (
                  <tr key={a.id}>
                    <td className="text-gray-400 text-sm">{a.fecha.slice(0, 16).replace('T', ' ')}</td>
                    <td className="text-right">{fmt(a.saldo_sistema)}</td>
                    <td className="text-right">{fmt(a.saldo_real)}</td>
                    <td className={`text-right font-semibold ${a.diferencia === 0 ? 'text-gray-400' : a.diferencia > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {a.diferencia > 0 ? '+' : ''}{fmt(a.diferencia)}
                    </td>
                    <td className="text-gray-400 text-sm">{a.notas || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Modal nuevo movimiento */}
      <Modal open={modalMov} onClose={() => { setModalMov(false); resetMov() }} title="Nuevo movimiento de caja">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Tipo *</label>
              <select className="input" value={tipo} onChange={e => setTipo(e.target.value as TipoMovimiento)}>
                <option value="INGRESO">Ingreso</option>
                <option value="EGRESO">Egreso</option>
              </select>
            </div>
            <div>
              <label className="label">Fecha *</label>
              <input type="date" className="input" value={fecha} onChange={e => setFecha(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">Concepto *</label>
            <input className="input" placeholder="Ej: Cobro factura FACT-000012" value={concepto} onChange={e => setConcepto(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Monto *</label>
              <input type="number" min="0" step="0.01" className="input" placeholder="0.00" value={monto} onChange={e => setMonto(e.target.value)} />
            </div>
            <div>
              <label className="label">Referencia</label>
              <input className="input" placeholder="Nro. factura, etc." value={referencia} onChange={e => setReferencia(e.target.value)} />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button className="btn btn-secondary" onClick={() => { setModalMov(false); resetMov() }}>Cancelar</button>
          <button className="btn btn-primary" onClick={guardarMov}>Guardar</button>
        </div>
      </Modal>

      {/* Modal arqueo */}
      <Modal open={modalArqueo} onClose={() => setModalArqueo(false)} title="Arqueo de caja">
        <div className="space-y-4">
          {resumen && (
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-gray-400 text-sm">Saldo según sistema</div>
              <div className="text-2xl font-bold text-white">{fmt(resumen.saldo_actual)}</div>
            </div>
          )}
          <div>
            <label className="label">Saldo real contado *</label>
            <input type="number" min="0" step="0.01" className="input" placeholder="0.00" value={saldoReal} onChange={e => setSaldoReal(e.target.value)} />
          </div>
          {saldoReal && resumen && (
            <div className={`rounded-lg p-3 text-sm font-medium ${+saldoReal - resumen.saldo_actual === 0 ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
              Diferencia: {+saldoReal - resumen.saldo_actual >= 0 ? '+' : ''}{fmt(+saldoReal - resumen.saldo_actual)}
            </div>
          )}
          <div>
            <label className="label">Notas</label>
            <textarea className="input" rows={2} placeholder="Observaciones..." value={notasArqueo} onChange={e => setNotasArqueo(e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button className="btn btn-secondary" onClick={() => setModalArqueo(false)}>Cancelar</button>
          <button className="btn btn-primary" onClick={guardarArqueo}>Registrar arqueo</button>
        </div>
      </Modal>
    </div>
  )
}
