import { useEffect, useState } from 'react'
import { invoke } from '../api'
import type { ReporteStockItem, ReporteDeudaCliente, ReporteMovimientoCaja, Factura } from '../../shared/types'
import PageHeader from '../components/PageHeader'
import { FileText, Package, Users, Wallet, TrendingUp } from 'lucide-react'

const fmt = (n: number) => n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 })
const hoy = () => new Date().toISOString().slice(0, 10)
const mes1 = () => { const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10) }

type TabType = 'stock' | 'deuda' | 'caja' | 'ventas'

const TABS: { id: TabType; label: string; icon: React.ElementType }[] = [
  { id: 'stock',  label: 'Stock',             icon: Package },
  { id: 'deuda',  label: 'Deuda clientes',    icon: Users },
  { id: 'caja',   label: 'Movimientos caja',  icon: Wallet },
  { id: 'ventas', label: 'Ventas por período', icon: TrendingUp },
]

export default function Reportes() {
  const [tab, setTab] = useState<TabType>('stock')
  const [desde, setDesde] = useState(mes1())
  const [hasta, setHasta] = useState(hoy())
  const [stock, setStock] = useState<ReporteStockItem[]>([])
  const [deuda, setDeuda] = useState<ReporteDeudaCliente[]>([])
  const [caja, setCaja] = useState<ReporteMovimientoCaja[]>([])
  const [ventas, setVentas] = useState<{ facturas: Factura[]; total: number } | null>(null)
  const [filtroCategoria, setFiltroCategoria] = useState('')

  useEffect(() => {
    invoke<ReporteStockItem[]>('reportes:stock').then(setStock)
    invoke<ReporteDeudaCliente[]>('reportes:deuda-clientes').then(setDeuda)
  }, [])

  useEffect(() => {
    invoke<ReporteMovimientoCaja[]>('reportes:caja-periodo', { desde, hasta }).then(setCaja)
    invoke<{ facturas: Factura[]; total: number }>('reportes:ventas-periodo', { desde, hasta }).then(setVentas)
  }, [desde, hasta])

  const stockFiltrado = filtroCategoria ? stock.filter(s => s.categoria === filtroCategoria) : stock
  const stockBajo = stock.filter(s => s.stock <= s.stock_minimo)

  return (
    <div className="p-6">
      <PageHeader title="Reportes y Listados" subtitle="Información consolidada para toma de decisiones">
        <div className="flex gap-2 items-center">
          <input type="date" className="input text-sm" value={desde} onChange={e => setDesde(e.target.value)} />
          <span className="text-gray-500 text-sm">→</span>
          <input type="date" className="input text-sm" value={hasta} onChange={e => setHasta(e.target.value)} />
        </div>
      </PageHeader>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-800">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t.id ? 'border-primary-500 text-primary-400' : 'border-transparent text-gray-400 hover:text-gray-200'}`}>
            <t.icon size={14} />{t.label}
          </button>
        ))}
      </div>

      {/* STOCK */}
      {tab === 'stock' && (
        <div>
          {stockBajo.length > 0 && (
            <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 mb-4 text-red-400 text-sm">
              ⚠ {stockBajo.length} producto{stockBajo.length !== 1 ? 's' : ''} con stock bajo o agotado
            </div>
          )}
          <div className="flex gap-3 mb-4">
            <select className="input w-48" value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)}>
              <option value="">Todas las categorías</option>
              <option value="FRO">FRO</option>
              <option value="CR">CR</option>
              <option value="FIJACION">FIJACION</option>
            </select>
            <div className="text-gray-400 text-sm self-center">{stockFiltrado.length} productos</div>
          </div>
          <div className="card overflow-hidden">
            <table className="table text-sm">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Descripción</th>
                  <th>Cat.</th>
                  <th className="text-right">Stock</th>
                  <th className="text-right">Mín.</th>
                  <th className="text-right">P. Minorista</th>
                  <th className="text-right">P. Mayorista</th>
                  <th className="text-right">P. Distrib.</th>
                </tr>
              </thead>
              <tbody>
                {stockFiltrado.map(s => (
                  <tr key={s.id} className={s.stock <= s.stock_minimo ? 'bg-red-900/10' : ''}>
                    <td className="font-mono text-xs text-gray-400">{s.codigo}</td>
                    <td className="font-medium">{s.descripcion}</td>
                    <td><span className="badge badge-gray">{s.categoria}</span></td>
                    <td className={`text-right font-semibold ${s.stock <= s.stock_minimo ? 'text-red-400' : 'text-gray-200'}`}>{s.stock}</td>
                    <td className="text-right text-gray-500">{s.stock_minimo}</td>
                    <td className="text-right">{fmt(s.precio_minorista)}</td>
                    <td className="text-right">{fmt(s.precio_mayorista)}</td>
                    <td className="text-right">{fmt(s.precio_distribuidora)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DEUDA CLIENTES */}
      {tab === 'deuda' && (
        <div>
          {deuda.length === 0
            ? <p className="text-gray-500 text-sm py-8 text-center">No hay facturas pendientes.</p>
            : (
              <>
                <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-3 mb-4 text-yellow-400 text-sm">
                  Total adeudado: <span className="font-bold">{fmt(deuda.reduce((s, d) => s + d.total_deuda, 0))}</span>
                  {' '}— {deuda.length} cliente{deuda.length !== 1 ? 's' : ''} con saldo pendiente
                </div>
                <div className="card overflow-hidden">
                  <table className="table text-sm">
                    <thead>
                      <tr>
                        <th>Cliente</th>
                        <th>Tipo</th>
                        <th className="text-right">Facturas pend.</th>
                        <th className="text-right">Total adeudado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deuda.map(d => (
                        <tr key={d.cliente_id}>
                          <td className="font-medium">{d.razon_social}</td>
                          <td><span className="badge badge-gray">{d.tipo}</span></td>
                          <td className="text-right text-yellow-400">{d.facturas_pendientes}</td>
                          <td className="text-right font-semibold text-red-400">{fmt(d.total_deuda)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )
          }
        </div>
      )}

      {/* CAJA POR PERÍODO */}
      {tab === 'caja' && (
        <div>
          {caja.length === 0
            ? <p className="text-gray-500 text-sm py-8 text-center">Sin movimientos en el período.</p>
            : (
              <>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="card p-4">
                    <div className="text-xs text-gray-400 mb-1">Total ingresos</div>
                    <div className="text-lg font-bold text-green-400">{fmt(caja.reduce((s, c) => s + c.ingresos, 0))}</div>
                  </div>
                  <div className="card p-4">
                    <div className="text-xs text-gray-400 mb-1">Total egresos</div>
                    <div className="text-lg font-bold text-red-400">{fmt(caja.reduce((s, c) => s + c.egresos, 0))}</div>
                  </div>
                  <div className="card p-4">
                    <div className="text-xs text-gray-400 mb-1">Resultado período</div>
                    <div className={`text-lg font-bold ${caja.reduce((s, c) => s + c.saldo_dia, 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {fmt(caja.reduce((s, c) => s + c.saldo_dia, 0))}
                    </div>
                  </div>
                </div>
                <div className="card overflow-hidden">
                  <table className="table text-sm">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th className="text-right">Ingresos</th>
                        <th className="text-right">Egresos</th>
                        <th className="text-right">Resultado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {caja.map(c => (
                        <tr key={c.fecha}>
                          <td className="text-gray-400">{c.fecha}</td>
                          <td className="text-right text-green-400">{fmt(c.ingresos)}</td>
                          <td className="text-right text-red-400">{fmt(c.egresos)}</td>
                          <td className={`text-right font-semibold ${c.saldo_dia >= 0 ? 'text-green-400' : 'text-red-400'}`}>{fmt(c.saldo_dia)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )
          }
        </div>
      )}

      {/* VENTAS POR PERÍODO */}
      {tab === 'ventas' && (
        <div>
          {!ventas || ventas.facturas.length === 0
            ? <p className="text-gray-500 text-sm py-8 text-center">Sin ventas en el período.</p>
            : (
              <>
                <div className="bg-green-900/20 border border-green-800 rounded-lg p-3 mb-4 text-green-400 text-sm">
                  {ventas.facturas.length} factura{ventas.facturas.length !== 1 ? 's' : ''} — Total: <span className="font-bold">{fmt(ventas.total)}</span>
                </div>
                <div className="card overflow-hidden">
                  <table className="table text-sm">
                    <thead>
                      <tr>
                        <th>Nro.</th>
                        <th>Fecha</th>
                        <th>Cliente</th>
                        <th>Estado</th>
                        <th className="text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ventas.facturas.map(f => (
                        <tr key={f.id}>
                          <td className="font-mono text-xs text-gray-400">{f.numero}</td>
                          <td className="text-gray-400">{f.fecha}</td>
                          <td className="font-medium">{f.cliente_nombre}</td>
                          <td><span className={`badge ${f.estado === 'PAGADA' ? 'badge-green' : f.estado === 'VENCIDA' ? 'badge-red' : 'badge-yellow'}`}>{f.estado}</span></td>
                          <td className="text-right font-semibold">{fmt(f.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )
          }
        </div>
      )}
    </div>
  )
}
