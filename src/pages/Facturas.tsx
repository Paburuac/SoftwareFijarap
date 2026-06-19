import { useEffect, useState } from 'react'
import { invoke } from '../api'
import type { Cliente, EstadoFactura, Factura, FacturaLinea, Producto } from '../../shared/types'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'
import EmptyState from '../components/EmptyState'
import { Plus, Receipt, Eye, Check, Trash2 } from 'lucide-react'

const ESTADO_BADGE: Record<EstadoFactura, string> = {
  PENDIENTE: 'badge-yellow', PAGADA: 'badge-green', VENCIDA: 'badge-red', ANULADA: 'badge-gray',
}

export default function Facturas() {
  const [items, setItems] = useState<Factura[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [modal, setModal] = useState(false)
  const [detalleModal, setDetalleModal] = useState(false)
  const [detalle, setDetalle] = useState<{ factura: Factura; lineas: FacturaLinea[] } | null>(null)

  const [clienteId, setClienteId] = useState('')
  const [vencimiento, setVencimiento] = useState('')
  const [notas, setNotas] = useState('')
  const [descuentoExtra, setDescuentoExtra] = useState(0)
  const [lineas, setLineas] = useState<{ producto_id: number; cantidad: number; precio_unitario: number; descuento: number; subtotal: number }[]>([])

  const cargar = () => invoke<Factura[]>('facturas:listar').then(setItems)
  useEffect(() => {
    cargar()
    invoke<Cliente[]>('clientes:listar').then(setClientes)
    invoke<Producto[]>('productos:listar').then(setProductos)
    const fecha30 = new Date(); fecha30.setDate(fecha30.getDate() + 30)
    setVencimiento(fecha30.toISOString().slice(0, 10))
  }, [])

  const clienteSeleccionado = clientes.find(c => c.id === +clienteId)

  const agregarLinea = () => {
    const p = productos[0]; if (!p) return
    const precio = clienteSeleccionado?.tipo === 'MAYORISTA' ? p.precio_mayorista
      : clienteSeleccionado?.tipo === 'DISTRIBUIDORA' ? p.precio_distribuidora
      : p.precio_minorista
    setLineas(prev => [...prev, { producto_id: p.id, cantidad: 1, precio_unitario: precio, descuento: clienteSeleccionado?.descuento ?? 0, subtotal: precio }])
  }

  const actualizarLinea = (idx: number, field: string, value: number) => {
    setLineas(prev => prev.map((l, i) => {
      if (i !== idx) return l
      const updated = { ...l, [field]: value }
      if (field === 'producto_id') {
        const prod = productos.find(p => p.id === value)
        if (prod) {
          updated.precio_unitario = clienteSeleccionado?.tipo === 'MAYORISTA' ? prod.precio_mayorista
            : clienteSeleccionado?.tipo === 'DISTRIBUIDORA' ? prod.precio_distribuidora
            : prod.precio_minorista
        }
      }
      updated.subtotal = updated.precio_unitario * updated.cantidad * (1 - updated.descuento / 100)
      return updated
    }))
  }

  const subtotal = lineas.reduce((s, l) => s + l.subtotal, 0)
  const total = subtotal * (1 - descuentoExtra / 100)

  const guardar = async () => {
    if (!clienteId || lineas.length === 0) return
    await invoke('facturas:crear', {
      factura: {
        presupuesto_id: null,
        cliente_id: +clienteId,
        fecha: new Date().toISOString().slice(0, 10),
        vencimiento,
        estado: 'PENDIENTE' as EstadoFactura,
        subtotal,
        descuento_extra: descuentoExtra,
        total,
        notas,
      },
      lineas,
    })
    setModal(false); cargar()
  }

  const verDetalle = async (id: number) => {
    const data = await invoke<{ factura: Factura; lineas: FacturaLinea[] }>('facturas:obtener', id)
    setDetalle(data); setDetalleModal(true)
  }

  const marcarPagada = async (id: number) => {
    await invoke('facturas:actualizar-estado', { id, estado: 'PAGADA' }); cargar()
  }

  const anular = async (id: number) => {
    await invoke('facturas:actualizar-estado', { id, estado: 'ANULADA' }); cargar()
  }

  return (
    <div className="p-8">
      <PageHeader
        title="Facturas"
        subtitle={`${items.length} facturas`}
        action={<button className="btn-primary" onClick={() => { setLineas([]); setClienteId(''); setNotas(''); setDescuentoExtra(0); setModal(true) }}><Plus size={16} /> Nueva factura</button>}
      />

      {items.length === 0 ? (
        <EmptyState icon={Receipt} title="No hay facturas" />
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-left">
                <th className="px-4 py-3 text-gray-500 font-medium">Número</th>
                <th className="px-4 py-3 text-gray-500 font-medium">Cliente</th>
                <th className="px-4 py-3 text-gray-500 font-medium">Fecha</th>
                <th className="px-4 py-3 text-gray-500 font-medium">Vencimiento</th>
                <th className="px-4 py-3 text-gray-500 font-medium">Estado</th>
                <th className="px-4 py-3 text-gray-500 font-medium text-right">Total</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.map(f => (
                <tr key={f.id} className="border-b border-gray-800/50 table-row-hover">
                  <td className="px-4 py-3 font-mono text-primary-400 text-xs">{f.numero}</td>
                  <td className="px-4 py-3 text-gray-200">{f.cliente_nombre}</td>
                  <td className="px-4 py-3 text-gray-400">{f.fecha}</td>
                  <td className={`px-4 py-3 ${f.estado === 'VENCIDA' || (f.estado === 'PENDIENTE' && f.vencimiento < new Date().toISOString().slice(0,10)) ? 'text-red-400' : 'text-gray-400'}`}>{f.vencimiento}</td>
                  <td className="px-4 py-3"><span className={ESTADO_BADGE[f.estado]}>{f.estado}</span></td>
                  <td className="px-4 py-3 text-right font-medium text-gray-100">${f.total.toLocaleString('es-AR')}</td>
                  <td className="px-4 py-3 text-right flex items-center justify-end gap-1">
                    <button className="btn-ghost p-1.5" onClick={() => verDetalle(f.id)}><Eye size={14} /></button>
                    {f.estado === 'PENDIENTE' && <button className="btn-ghost p-1.5 text-green-400" onClick={() => marcarPagada(f.id)}><Check size={14} /></button>}
                    {f.estado !== 'ANULADA' && f.estado !== 'PAGADA' && <button className="btn-ghost p-1.5 text-red-400" onClick={() => anular(f.id)}><Trash2 size={14} /></button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal nueva factura */}
      <Modal open={modal} title="Nueva factura" onClose={() => setModal(false)} size="xl">
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="col-span-2">
            <label className="label">Cliente *</label>
            <select className="input" value={clienteId} onChange={e => setClienteId(e.target.value)}>
              <option value="">Seleccionar cliente...</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.razon_social} ({c.tipo})</option>)}
            </select>
          </div>
          <div>
            <label className="label">Vencimiento</label>
            <input className="input" type="date" value={vencimiento} onChange={e => setVencimiento(e.target.value)} />
          </div>
        </div>

        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <label className="label">Productos</label>
            <button className="btn-ghost text-xs py-1 px-2" onClick={agregarLinea}><Plus size={12} /> Agregar</button>
          </div>
          <div className="space-y-2">
            {lineas.map((l, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-5">
                  <select className="input text-xs" value={l.producto_id} onChange={e => actualizarLinea(i, 'producto_id', +e.target.value)}>
                    {productos.map(p => <option key={p.id} value={p.id}>{p.codigo} - {p.descripcion}</option>)}
                  </select>
                </div>
                <div className="col-span-2"><input className="input text-xs" type="number" placeholder="Cant." value={l.cantidad} onChange={e => actualizarLinea(i, 'cantidad', +e.target.value)} /></div>
                <div className="col-span-2"><input className="input text-xs" type="number" placeholder="Precio" value={l.precio_unitario} onChange={e => actualizarLinea(i, 'precio_unitario', +e.target.value)} /></div>
                <div className="col-span-1"><input className="input text-xs" type="number" placeholder="Desc%" value={l.descuento} onChange={e => actualizarLinea(i, 'descuento', +e.target.value)} /></div>
                <div className="col-span-1 text-right text-xs text-gray-300">${l.subtotal.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</div>
                <div className="col-span-1 text-right"><button className="btn-ghost p-1" onClick={() => setLineas(prev => prev.filter((_, j) => j !== i))}><Trash2 size={12} /></button></div>
              </div>
            ))}
            {lineas.length === 0 && <div className="text-center py-4 text-gray-600 text-sm">Agregá productos a la factura</div>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <label className="label">Notas</label>
            <textarea className="input h-20 resize-none" value={notas} onChange={e => setNotas(e.target.value)} />
          </div>
          <div className="flex flex-col gap-3">
            <div>
              <label className="label">Descuento extra (%)</label>
              <input className="input" type="number" value={descuentoExtra} onChange={e => setDescuentoExtra(+e.target.value)} />
            </div>
            <div className="card bg-gray-800 border-gray-700 text-right">
              <div className="text-xs text-gray-500">Subtotal: ${subtotal.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</div>
              <div className="text-lg font-bold text-gray-100 mt-1">Total: ${total.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button className="btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
          <button className="btn-primary" onClick={guardar} disabled={!clienteId || lineas.length === 0}>Guardar factura</button>
        </div>
      </Modal>

      <Modal open={detalleModal} title={`Factura ${detalle?.factura.numero}`} onClose={() => setDetalleModal(false)} size="lg">
        {detalle && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-gray-500">Cliente:</span> <span className="text-gray-200">{detalle.factura.cliente_nombre}</span></div>
              <div><span className="text-gray-500">Fecha:</span> <span className="text-gray-200">{detalle.factura.fecha}</span></div>
              <div><span className="text-gray-500">Vencimiento:</span> <span className="text-gray-200">{detalle.factura.vencimiento}</span></div>
              <div><span className="text-gray-500">Estado:</span> <span className={ESTADO_BADGE[detalle.factura.estado]}>{detalle.factura.estado}</span></div>
            </div>
            <table className="w-full text-xs">
              <thead><tr className="border-b border-gray-800"><th className="text-left py-2 text-gray-500">Producto</th><th className="text-right py-2 text-gray-500">Cant.</th><th className="text-right py-2 text-gray-500">Precio</th><th className="text-right py-2 text-gray-500">Desc%</th><th className="text-right py-2 text-gray-500">Subtotal</th></tr></thead>
              <tbody>
                {detalle.lineas.map(l => (
                  <tr key={l.id} className="border-b border-gray-800/40">
                    <td className="py-2 text-gray-300">{l.producto_codigo} - {l.producto_descripcion}</td>
                    <td className="py-2 text-right text-gray-400">{l.cantidad}</td>
                    <td className="py-2 text-right text-gray-400">${l.precio_unitario.toLocaleString('es-AR')}</td>
                    <td className="py-2 text-right text-gray-400">{l.descuento}%</td>
                    <td className="py-2 text-right text-gray-200 font-medium">${l.subtotal.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="text-right text-sm">
              <div className="text-gray-500">Subtotal: ${detalle.factura.subtotal.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</div>
              <div className="text-xl font-bold text-gray-100 mt-1">Total: ${detalle.factura.total.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
