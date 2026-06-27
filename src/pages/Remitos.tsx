import { useEffect, useState } from 'react'
import { invoke } from '../api'
import type { Cliente, EstadoRemito, Factura, Producto, Remito, RemitoLinea } from '../../shared/types'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'
import EmptyState from '../components/EmptyState'
import { Plus, Truck, Eye, Check, X } from 'lucide-react'

const ESTADO_BADGE: Record<EstadoRemito, string> = {
  PENDIENTE: 'badge-yellow', ENTREGADO: 'badge-green', ANULADO: 'badge-gray',
}

export default function Remitos() {
  const [items, setItems] = useState<Remito[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [facturas, setFacturas] = useState<Factura[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [modal, setModal] = useState(false)
  const [detalleModal, setDetalleModal] = useState(false)
  const [detalle, setDetalle] = useState<{ remito: Remito; lineas: RemitoLinea[] } | null>(null)

  const [clienteId, setClienteId] = useState('')
  const [facturaId, setFacturaId] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))
  const [notas, setNotas] = useState('')
  const [lineas, setLineas] = useState<{ producto_id: number; cantidad: number }[]>([])

  const cargar = () => invoke<Remito[]>('remitos:listar').then(setItems)

  useEffect(() => {
    cargar()
    invoke<Cliente[]>('clientes:listar').then(setClientes)
    invoke<Factura[]>('facturas:listar').then(setFacturas)
    invoke<Producto[]>('productos:listar').then(setProductos)
  }, [])

  const reset = () => {
    setClienteId(''); setFacturaId(''); setFecha(new Date().toISOString().slice(0, 10))
    setNotas(''); setLineas([])
  }

  const agregarLinea = () => {
    const p = productos[0]; if (!p) return
    setLineas(prev => [...prev, { producto_id: p.id, cantidad: 1 }])
  }

  const actualizarLinea = (idx: number, field: string, value: number) =>
    setLineas(prev => prev.map((l, i) => i !== idx ? l : { ...l, [field]: value }))

  const guardar = async () => {
    if (!clienteId || lineas.length === 0) return
    await invoke('remitos:crear', {
      remito: { factura_id: facturaId ? +facturaId : null, cliente_id: +clienteId, fecha, estado: 'PENDIENTE', notas },
      lineas,
    })
    setModal(false); reset(); cargar()
  }

  const verDetalle = async (id: number) => {
    const d = await invoke<{ remito: Remito; lineas: RemitoLinea[] }>('remitos:obtener', id)
    setDetalle(d); setDetalleModal(true)
  }

  const cambiarEstado = async (id: number, estado: EstadoRemito) => {
    await invoke('remitos:actualizar-estado', { id, estado }); cargar()
  }

  return (
    <div className="p-6">
      <PageHeader title="Remitos" subtitle="Comprobantes de entrega de mercadería">
        <button onClick={() => setModal(true)} className="btn btn-primary flex items-center gap-2">
          <Plus size={16} /> Nuevo remito
        </button>
      </PageHeader>

      {items.length === 0
        ? <EmptyState icon={Truck} title="Sin remitos" description="Creá el primer remito de entrega." />
        : (
          <div className="card overflow-hidden">
            <table className="table">
              <thead>
                <tr><th>Nro.</th><th>Fecha</th><th>Cliente</th><th>Factura</th><th>Estado</th><th>Acciones</th></tr>
              </thead>
              <tbody>
                {items.map(r => (
                  <tr key={r.id}>
                    <td className="font-mono text-xs text-gray-400">{r.numero}</td>
                    <td className="text-gray-400 text-sm">{r.fecha}</td>
                    <td className="font-medium">{r.cliente_nombre}</td>
                    <td className="text-gray-400 text-sm">{r.factura_id ? `#${r.factura_id}` : '—'}</td>
                    <td><span className={`badge ${ESTADO_BADGE[r.estado]}`}>{r.estado}</span></td>
                    <td>
                      <div className="flex gap-1">
                        <button onClick={() => verDetalle(r.id)} className="btn-icon text-gray-400 hover:text-white" title="Ver detalle"><Eye size={15} /></button>
                        {r.estado === 'PENDIENTE' && (
                          <>
                            <button onClick={() => cambiarEstado(r.id, 'ENTREGADO')} className="btn-icon text-gray-400 hover:text-green-400" title="Marcar entregado"><Check size={15} /></button>
                            <button onClick={() => cambiarEstado(r.id, 'ANULADO')} className="btn-icon text-gray-400 hover:text-red-400" title="Anular"><X size={15} /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }

      {/* Modal crear */}
      <Modal open={modal} onClose={() => { setModal(false); reset() }} title="Nuevo remito">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Cliente *</label>
              <select className="input" value={clienteId} onChange={e => setClienteId(e.target.value)}>
                <option value="">Seleccionar...</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.razon_social}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Factura asociada</label>
              <select className="input" value={facturaId} onChange={e => setFacturaId(e.target.value)}>
                <option value="">Sin factura</option>
                {facturas.filter(f => !clienteId || f.cliente_id === +clienteId).map(f =>
                  <option key={f.id} value={f.id}>{f.numero}</option>
                )}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Fecha</label>
              <input type="date" className="input" value={fecha} onChange={e => setFecha(e.target.value)} />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Productos</label>
              <button onClick={agregarLinea} className="btn btn-secondary text-xs py-1 px-2">+ Agregar</button>
            </div>
            {lineas.length === 0 && <p className="text-gray-500 text-sm">Agregá al menos un producto.</p>}
            <div className="space-y-2">
              {lineas.map((l, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <select className="input flex-1" value={l.producto_id} onChange={e => actualizarLinea(i, 'producto_id', +e.target.value)}>
                    {productos.map(p => <option key={p.id} value={p.id}>{p.codigo} - {p.descripcion}</option>)}
                  </select>
                  <input type="number" min="1" className="input w-20" value={l.cantidad} onChange={e => actualizarLinea(i, 'cantidad', +e.target.value)} />
                  <button onClick={() => setLineas(prev => prev.filter((_, j) => j !== i))} className="btn-icon text-gray-500 hover:text-red-400"><X size={14} /></button>
                </div>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Notas</label>
            <textarea className="input" rows={2} value={notas} onChange={e => setNotas(e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button className="btn btn-secondary" onClick={() => { setModal(false); reset() }}>Cancelar</button>
          <button className="btn btn-primary" onClick={guardar}>Crear remito</button>
        </div>
      </Modal>

      {/* Modal detalle */}
      <Modal open={detalleModal} onClose={() => setDetalleModal(false)} title={`Remito ${detalle?.remito.numero}`}>
        {detalle && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-400">Cliente:</span> <span className="text-gray-100">{detalle.remito.cliente_nombre}</span></div>
              <div><span className="text-gray-400">Fecha:</span> <span className="text-gray-100">{detalle.remito.fecha}</span></div>
              <div><span className="text-gray-400">Estado:</span> <span className={`badge ${ESTADO_BADGE[detalle.remito.estado]}`}>{detalle.remito.estado}</span></div>
            </div>
            <table className="table text-sm mt-3">
              <thead><tr><th>Código</th><th>Producto</th><th className="text-right">Cantidad</th></tr></thead>
              <tbody>
                {detalle.lineas.map(l => (
                  <tr key={l.id}>
                    <td className="font-mono text-xs text-gray-400">{l.producto_codigo}</td>
                    <td>{l.producto_descripcion}</td>
                    <td className="text-right font-medium">{l.cantidad}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {detalle.remito.notas && <p className="text-gray-400 text-sm">{detalle.remito.notas}</p>}
          </div>
        )}
      </Modal>
    </div>
  )
}
