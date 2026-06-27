import { useEffect, useState } from 'react'
import { invoke } from '../api'
import type { EstadisticasGenerales, VentaMensual, ProductoTop, ClienteTop } from '../../shared/types'
import { TrendingUp, Users, Package, Receipt, BarChart2 } from 'lucide-react'
import PageHeader from '../components/PageHeader'

const fmt = (n: number) => n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 })
const fmtN = (n: number) => n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function BarraHorizontal({ valor, max, color = 'bg-primary-500' }: { valor: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.round((valor / max) * 100) : 0
  return (
    <div className="w-full bg-gray-800 rounded-full h-2">
      <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
    </div>
  )
}

function GraficoBarras({ datos }: { datos: VentaMensual[] }) {
  const max = Math.max(...datos.map(d => d.total), 1)
  return (
    <div className="flex items-end gap-2 h-40 mt-4">
      {datos.map(d => {
        const pct = Math.max((d.total / max) * 100, 2)
        return (
          <div key={d.mes} className="flex-1 flex flex-col items-center gap-1 group">
            <div className="relative w-full" style={{ height: '128px' }}>
              <div
                className="absolute bottom-0 w-full bg-primary-600 hover:bg-primary-500 rounded-t transition-all cursor-default"
                style={{ height: `${pct}%` }}
                title={`${d.mes}: ${fmt(d.total)}`}
              />
            </div>
            <span className="text-gray-500 text-xs rotate-45 origin-left whitespace-nowrap">{d.mes.slice(5)}/{d.mes.slice(2,4)}</span>
          </div>
        )
      })}
    </div>
  )
}

export default function Estadisticas() {
  const [generales, setGenerales] = useState<EstadisticasGenerales | null>(null)
  const [ventas, setVentas] = useState<VentaMensual[]>([])
  const [productosTop, setProductosTop] = useState<ProductoTop[]>([])
  const [clientesTop, setClientesTop] = useState<ClienteTop[]>([])
  const [meses, setMeses] = useState(12)

  const cargar = () => {
    invoke<EstadisticasGenerales>('estadisticas:generales').then(setGenerales)
    invoke<VentaMensual[]>('estadisticas:ventas-mensuales', { meses }).then(setVentas)
    invoke<ProductoTop[]>('estadisticas:productos-top', { limite: 10 }).then(setProductosTop)
    invoke<ClienteTop[]>('estadisticas:clientes-top', { limite: 10 }).then(setClientesTop)
  }

  useEffect(() => { cargar() }, [meses])

  return (
    <div className="p-6">
      <PageHeader title="Estadísticas" subtitle="Análisis de ventas y rendimiento" />

      {/* KPIs */}
      {generales && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Ventas del año', value: fmt(generales.ventas_anio), icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-900/20' },
            { label: 'Ventas del mes', value: fmt(generales.ventas_mes), icon: Receipt, color: 'text-blue-400', bg: 'bg-blue-900/20' },
            { label: 'Ticket promedio', value: fmt(generales.ticket_promedio), icon: BarChart2, color: 'text-yellow-400', bg: 'bg-yellow-900/20' },
            { label: 'Clientes activos', value: generales.total_clientes_activos, icon: Users, color: 'text-primary-400', bg: 'bg-primary-900/20' },
          ].map(c => (
            <div key={c.label} className="card">
              <div className={`w-9 h-9 ${c.bg} rounded-lg flex items-center justify-center mb-3`}>
                <c.icon size={18} className={c.color} />
              </div>
              <div className="text-xl font-bold text-gray-100">{c.value}</div>
              <div className="text-xs text-gray-500 mt-1">{c.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Gráfico ventas mensuales */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-gray-300">Ventas mensuales</h2>
          <select className="input text-xs py-1 w-auto" value={meses} onChange={e => setMeses(+e.target.value)}>
            <option value={6}>Últimos 6 meses</option>
            <option value={12}>Últimos 12 meses</option>
            <option value={24}>Últimos 24 meses</option>
          </select>
        </div>
        {ventas.length === 0
          ? <p className="text-gray-500 text-sm py-8 text-center">Sin datos de ventas aún.</p>
          : <GraficoBarras datos={ventas} />
        }
        {ventas.length > 0 && (
          <div className="mt-6 overflow-x-auto">
            <table className="table text-sm">
              <thead><tr><th>Mes</th><th className="text-right">Facturas</th><th className="text-right">Total</th></tr></thead>
              <tbody>
                {ventas.map(v => (
                  <tr key={v.mes}>
                    <td className="text-gray-300">{v.mes}</td>
                    <td className="text-right text-gray-400">{v.cantidad}</td>
                    <td className="text-right font-medium text-green-400">{fmt(v.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Productos top */}
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2"><Package size={15} /> Productos más vendidos</h2>
          {productosTop.length === 0
            ? <p className="text-gray-500 text-sm">Sin ventas registradas.</p>
            : (
              <div className="space-y-3">
                {productosTop.map((p, i) => (
                  <div key={p.producto_id}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-300 truncate max-w-[60%]">{i + 1}. {p.descripcion}</span>
                      <span className="text-green-400 font-medium">{fmt(p.total_vendido)}</span>
                    </div>
                    <BarraHorizontal valor={p.total_vendido} max={productosTop[0]?.total_vendido ?? 1} />
                  </div>
                ))}
              </div>
            )
          }
        </div>

        {/* Clientes top */}
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2"><Users size={15} /> Clientes top</h2>
          {clientesTop.length === 0
            ? <p className="text-gray-500 text-sm">Sin ventas registradas.</p>
            : (
              <div className="space-y-3">
                {clientesTop.map((c, i) => (
                  <div key={c.cliente_id}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-300 truncate max-w-[60%]">{i + 1}. {c.razon_social}</span>
                      <span className="text-blue-400 font-medium">{fmt(c.total_comprado)}</span>
                    </div>
                    <BarraHorizontal valor={c.total_comprado} max={clientesTop[0]?.total_comprado ?? 1} color="bg-blue-600" />
                  </div>
                ))}
              </div>
            )
          }
        </div>
      </div>
    </div>
  )
}
