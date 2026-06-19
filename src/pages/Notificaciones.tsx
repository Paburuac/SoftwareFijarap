import { useEffect, useState } from 'react'
import { invoke } from '../api'
import type { Notificacion } from '../../shared/types'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'
import { Bell, Package, Receipt, FileText, Info, Check } from 'lucide-react'

const TIPO_ICON: Record<Notificacion['tipo'], React.ElementType> = {
  STOCK_BAJO: Package, FACTURA_VENCIDA: Receipt, PRESUPUESTO_VENCIDO: FileText, INFO: Info,
}
const TIPO_COLOR: Record<Notificacion['tipo'], string> = {
  STOCK_BAJO: 'text-orange-400', FACTURA_VENCIDA: 'text-red-400', PRESUPUESTO_VENCIDO: 'text-yellow-400', INFO: 'text-blue-400',
}

export default function Notificaciones() {
  const [items, setItems] = useState<Notificacion[]>([])

  const cargar = () => invoke<Notificacion[]>('notificaciones:listar').then(setItems)
  useEffect(() => { cargar() }, [])

  const marcarLeida = async (id: number) => {
    await invoke('notificaciones:marcar-leida', id); cargar()
  }

  const marcarTodas = async () => {
    await Promise.all(items.filter(n => !n.leida).map(n => invoke('notificaciones:marcar-leida', n.id)))
    cargar()
  }

  const sinLeer = items.filter(n => !n.leida).length

  return (
    <div className="p-8">
      <PageHeader
        title="Notificaciones"
        subtitle={sinLeer > 0 ? `${sinLeer} sin leer` : 'Todo al día'}
        action={sinLeer > 0 ? <button className="btn-secondary" onClick={marcarTodas}><Check size={14} /> Marcar todas como leídas</button> : undefined}
      />

      {items.length === 0 ? (
        <EmptyState icon={Bell} title="Sin notificaciones" description="Aquí aparecerán alertas de stock, facturas vencidas y más." />
      ) : (
        <div className="space-y-2">
          {items.map(n => {
            const Icon = TIPO_ICON[n.tipo]
            return (
              <div
                key={n.id}
                className={`card flex items-start gap-4 transition-opacity ${n.leida ? 'opacity-50' : ''}`}
              >
                <div className={`mt-0.5 ${TIPO_COLOR[n.tipo]}`}>
                  <Icon size={18} />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-200">{n.mensaje}</p>
                  <p className="text-xs text-gray-600 mt-1">{n.creado_en}</p>
                </div>
                {!n.leida && (
                  <button className="btn-ghost p-1.5 shrink-0" title="Marcar como leída" onClick={() => marcarLeida(n.id)}>
                    <Check size={14} />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
