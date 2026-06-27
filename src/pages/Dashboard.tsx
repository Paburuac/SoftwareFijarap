import { useEffect, useState } from 'react'
import { invoke } from '../api'
import type { DashboardStats } from '../../shared/types'
import {
  Package, AlertTriangle, FileText, Receipt,
  Factory, Bell, TrendingUp, ShoppingCart,
} from 'lucide-react'

interface StatCard {
  label: string
  value: string | number
  icon: React.ElementType
  color: string
  bg: string
  alert?: boolean
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)

  useEffect(() => {
    invoke<DashboardStats>('dashboard:stats').then(setStats)
    const id = setInterval(() => invoke<DashboardStats>('dashboard:stats').then(setStats), 30_000)
    return () => clearInterval(id)
  }, [])

  if (!stats) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="text-gray-500">Cargando...</div>
      </div>
    )
  }

  const cards: StatCard[] = [
    {
      label: 'Ventas del mes',
      value: `$${stats.ventas_mes.toLocaleString('es-AR', { minimumFractionDigits: 0 })}`,
      icon: TrendingUp,
      color: 'text-green-400',
      bg: 'bg-green-900/20',
    },
    {
      label: 'Facturas pendientes',
      value: stats.facturas_pendientes,
      icon: Receipt,
      color: 'text-blue-400',
      bg: 'bg-blue-900/20',
    },
    {
      label: 'Facturas vencidas',
      value: stats.facturas_vencidas,
      icon: AlertTriangle,
      color: 'text-red-400',
      bg: 'bg-red-900/20',
      alert: stats.facturas_vencidas > 0,
    },
    {
      label: 'Presupuestos activos',
      value: stats.presupuestos_pendientes,
      icon: FileText,
      color: 'text-yellow-400',
      bg: 'bg-yellow-900/20',
    },
    {
      label: 'Órdenes de fabricación',
      value: stats.ordenes_fabricacion_activas,
      icon: Factory,
      color: 'text-primary-400',
      bg: 'bg-primary-900/20',
    },
    {
      label: 'Productos bajo stock',
      value: stats.productos_bajo_stock,
      icon: Package,
      color: 'text-orange-400',
      bg: 'bg-orange-900/20',
      alert: stats.productos_bajo_stock > 0,
    },
    {
      label: 'Mat. primas bajo stock',
      value: stats.materias_primas_bajo_stock,
      icon: ShoppingCart,
      color: 'text-orange-400',
      bg: 'bg-orange-900/20',
      alert: stats.materias_primas_bajo_stock > 0,
    },
    {
      label: 'Notificaciones sin leer',
      value: stats.notificaciones_sin_leer,
      icon: Bell,
      color: 'text-purple-400',
      bg: 'bg-purple-900/20',
      alert: stats.notificaciones_sin_leer > 0,
    },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-100">Panel principal</h1>
        <p className="text-gray-500 text-sm mt-1">
          {new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className={`card relative overflow-hidden ${card.alert ? 'border-red-800/60' : ''}`}
          >
            {card.alert && (
              <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full m-3" />
            )}
            <div className={`w-10 h-10 ${card.bg} rounded-lg flex items-center justify-center mb-3`}>
              <card.icon size={20} className={card.color} />
            </div>
            <div className="text-2xl font-bold text-gray-100">{card.value}</div>
            <div className="text-xs text-gray-500 mt-1">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="mt-8 card">
        <h2 className="text-sm font-semibold text-gray-300 mb-1">Navegación</h2>
        <p className="text-xs text-gray-500">Usá el menú lateral para navegar entre módulos.</p>
      </div>
    </div>
  )
}
