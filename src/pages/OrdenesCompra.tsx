import { useEffect, useState } from 'react'
import { invoke } from '../api'
import type { MateriaPrima, OrdenCompra, OrdenCompraLinea, Proveedor } from '../../shared/types'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'
import EmptyState from '../components/EmptyState'
import { Plus, ShoppingCart, Eye, Check, Trash2 } from 'lucide-react'

const ESTADO_BADGE: Record<string, string> = { PENDIENTE: 'badge-yellow', RECIBIDA: 'badge-green', CANCELADA: 'badge-red' }

export default function OrdenesCompra() {
  const [items, setItems] = useState<OrdenCompra[]>([])
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [materias, setMaterias] = useState<MateriaPrima[]>([])
  const [modal, setModal] = useState(false)
  const [detalleModal, setDetalleModal] = useState(false)
  const [detalle, setDetalle] = useState<{ orden: OrdenCompra; lineas: OrdenCompraLinea[] } | null>(null)

  const [proveedorId, setProveedorId] = useState('')
  const [notas, setNotas] = useState('')
  const [lineas, setLineas] = useState<{ materia_prima_id: number; cantidad: number; precio_unitario: number; subtotal: number }[]>([])

  const cargar = () => invoke<OrdenCompra[]>('ordenes-compra:listar').then(setItems)
  useEffect(() => {
    cargar()
    invoke<Proveedor[]>('proveedores:listar').then(setProveedores)
    invoke<MateriaPrima[]>('materias-primas:listar').then(setMaterias)
  }, [])

  const agregarLinea = () => {
    const mp = materias[0]; if (!mp) return
    setLineas(prev => [...prev, { materia_prima_id: mp.id, cantidad: 1, precio_unitario: mp.precio_referencia, subtotal: mp.precio_referencia }])
  }

  const actualizarLinea = (idx: number, field: string, value: number) => {
    setLineas(prev => prev.map((l, i) => {
      if (i !== idx) return l
      const updated = { ...l, [field]: value }
      if (field === 'materia_prima_id') {
        const mp = materias.find(m => m.id === value)
        if (mp) updated.precio_unitario = mp.precio_referencia
      }
      updated.subtotal = updated.precio_unitario * updated.cantidad
      return updated
    }))
  }

  const total = lineas.reduce((s, l) => s + l.subtotal, 0)

  const guardar = async () => {
    if (!proveedorId || lineas.length === 0) return
    await invoke('ordenes-compra:crear', {
      orden: { proveedor_id: +proveedorId, fecha: new Date().toISOString().slice(0, 10), estado: 'PENDIENTE', total, notas },
      lineas,
    })
    setModal(false); cargar()
  }

  const verDetalle = async (id: number) => {
    const data = await invoke<{ orden: OrdenCompra; lineas: OrdenCompraLinea[] }>('ordenes-compra:obtener', id)
    setDetalle(data); setDetalleModal(true)
  }

  const recibir = async (id: number) => {
    await invoke('ordenes-compra:recibir', id); cargar()
  }

  return (
    <div className="p-8">
      <PageHeader
        title="Órdenes de Compra"
        subtitle="Compra de materia prima a proveedores"
        action={<button className="btn-primary" onClick={() => { setLineas([]); setProveedorId(''); setNotas(''); setModal(true) }}><Plus size={16} /> Nueva orden</button>}
      />

      {items.length === 0 ? (
        <EmptyState icon={ShoppingCart} title="No hay órdenes de compra" />
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-left">
                <th className="px-4 py-3 text-gray-500 font-medium">Número</th>
                <th className="px-4 py-3 text-gray-500 font-medium">Proveedor</th>
                <th className="px-4 py-3 text-gray-500 font-medium">Fecha</th>
                <th className="px-4 py-3 text-gray-500 font-medium">Estado</th>
                <th className="px-4 py-3 text-gray-500 font-medium text-right">Total</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.map(o => (
                <tr key={o.id} className="border-b border-gray-800/50 table-row-hover">
                  <td className="px-4 py-3 font-mono text-primary-400 text-xs">{o.numero}</td>
                  <td className="px-4 py-3 text-gray-200">{o.proveedor_nombre}</td>
                  <td className="px-4 py-3 text-gray-400">{o.fecha}</td>
                  <td className="px-4 py-3"><span className={ESTADO_BADGE[o.estado]}>{o.estado}</span></td>
                  <td className="px-4 py-3 text-right font-medium text-gray-100">${o.total.toLocaleString('es-AR')}</td>
                  <td className="px-4 py-3 text-right flex items-center justify-end gap-1">
                    <button className="btn-ghost p-1.5" onClick={() => verDetalle(o.id)}><Eye size={14} /></button>
                    {o.estado === 'PENDIENTE' && <button className="btn-ghost p-1.5 text-green-400" title="Marcar como recibida" onClick={() => recibir(o.id)}><Check size={14} /></button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modal} title="Nueva orden de compra" onClose={() => setModal(false)} size="xl">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="col-span-2">
            <label className="label">Proveedor *</label>
            <select className="input" value={proveedorId} onChange={e => setProveedorId(e.target.value)}>
              <option value="">Seleccionar proveedor...</option>
              {proveedores.map(p => <option key={p.id} value={p.id}>{p.razon_social}</option>)}
            </select>
          </div>
        </div>

        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <label className="label">Materias primas</label>
            <button className="btn-ghost text-xs py-1 px-2" onClick={agregarLinea}><Plus size={12} /> Agregar</button>
          </div>
          <div className="space-y-2">
            {lineas.map((l, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-6">
                  <select className="input text-xs" value={l.materia_prima_id} onChange={e => actualizarLinea(i, 'materia_prima_id', +e.target.value)}>
                    {materias.map(m => <option key={m.id} value={m.id}>{m.codigo} - {m.descripcion}</option>)}
                  </select>
                </div>
                <div className="col-span-2"><input className="input text-xs" type="number" placeholder="Cant." value={l.cantidad} onChange={e => actualizarLinea(i, 'cantidad', +e.target.value)} /></div>
                <div className="col-span-2"><input className="input text-xs" type="number" placeholder="Precio" value={l.precio_unitario} onChange={e => actualizarLinea(i, 'precio_unitario', +e.target.value)} /></div>
                <div className="col-span-1 text-right text-xs text-gray-300">${l.subtotal.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</div>
                <div className="col-span-1 text-right"><button className="btn-ghost p-1" onClick={() => setLineas(prev => prev.filter((_, j) => j !== i))}><Trash2 size={12} /></button></div>
              </div>
            ))}
            {lineas.length === 0 && <div className="text-center py-4 text-gray-600 text-sm">Agregá materias primas</div>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <label className="label">Notas</label>
            <textarea className="input h-20 resize-none" value={notas} onChange={e => setNotas(e.target.value)} />
          </div>
          <div className="card bg-gray-800 border-gray-700 text-right self-end">
            <div className="text-lg font-bold text-gray-100">Total: ${total.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button className="btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
          <button className="btn-primary" onClick={guardar} disabled={!proveedorId || lineas.length === 0}>Guardar orden</button>
        </div>
      </Modal>

      <Modal open={detalleModal} title={`Orden ${detalle?.orden.numero}`} onClose={() => setDetalleModal(false)} size="lg">
        {detalle && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-gray-500">Proveedor:</span> <span className="text-gray-200">{detalle.orden.proveedor_nombre}</span></div>
              <div><span className="text-gray-500">Fecha:</span> <span className="text-gray-200">{detalle.orden.fecha}</span></div>
              <div><span className="text-gray-500">Estado:</span> <span className={ESTADO_BADGE[detalle.orden.estado]}>{detalle.orden.estado}</span></div>
            </div>
            <table className="w-full text-xs">
              <thead><tr className="border-b border-gray-800"><th className="text-left py-2 text-gray-500">Materia prima</th><th className="text-right py-2 text-gray-500">Cant.</th><th className="text-right py-2 text-gray-500">Precio</th><th className="text-right py-2 text-gray-500">Subtotal</th></tr></thead>
              <tbody>
                {detalle.lineas.map(l => (
                  <tr key={l.id} className="border-b border-gray-800/40">
                    <td className="py-2 text-gray-300">{l.materia_prima_descripcion}</td>
                    <td className="py-2 text-right text-gray-400">{l.cantidad}</td>
                    <td className="py-2 text-right text-gray-400">${l.precio_unitario.toLocaleString('es-AR')}</td>
                    <td className="py-2 text-right text-gray-200 font-medium">${l.subtotal.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="text-right text-lg font-bold text-gray-100">Total: ${detalle.orden.total.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</div>
            {detalle.orden.estado === 'PENDIENTE' && (
              <div className="flex justify-end">
                <button className="btn-primary" onClick={async () => { await invoke('ordenes-compra:recibir', detalle.orden.id); setDetalleModal(false); cargar() }}>
                  <Check size={14} /> Marcar como recibida (suma stock)
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
