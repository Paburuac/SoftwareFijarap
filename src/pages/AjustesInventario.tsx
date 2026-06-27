import { useEffect, useState } from 'react'
import { invoke } from '../api'
import type { AjusteInventario, AjusteInventarioLinea, Producto, TipoAjuste } from '../../shared/types'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'
import EmptyState from '../components/EmptyState'
import { Plus, ClipboardEdit, Eye, X } from 'lucide-react'

const TIPO_BADGE: Record<TipoAjuste, string> = {
  ENTRADA: 'badge-green', SALIDA: 'badge-red', CORRECCION: 'badge-yellow',
}

const TIPO_LABEL: Record<TipoAjuste, string> = {
  ENTRADA: 'Entrada', SALIDA: 'Salida', CORRECCION: 'Corrección',
}

export default function AjustesInventario() {
  const [items, setItems] = useState<AjusteInventario[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [modal, setModal] = useState(false)
  const [detalleModal, setDetalleModal] = useState(false)
  const [detalle, setDetalle] = useState<{ ajuste: AjusteInventario; lineas: AjusteInventarioLinea[] } | null>(null)

  const [tipo, setTipo] = useState<TipoAjuste>('ENTRADA')
  const [motivo, setMotivo] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))
  const [lineas, setLineas] = useState<{ producto_id: number; cantidad_ajuste: number }[]>([])

  const cargar = () => invoke<AjusteInventario[]>('ajustes:listar').then(setItems)

  useEffect(() => {
    cargar()
    invoke<Producto[]>('productos:listar').then(setProductos)
  }, [])

  const reset = () => {
    setTipo('ENTRADA'); setMotivo(''); setFecha(new Date().toISOString().slice(0, 10)); setLineas([])
  }

  const agregarLinea = () => {
    const p = productos[0]; if (!p) return
    setLineas(prev => [...prev, { producto_id: p.id, cantidad_ajuste: 1 }])
  }

  const actualizarLinea = (idx: number, field: string, value: number) =>
    setLineas(prev => prev.map((l, i) => i !== idx ? l : { ...l, [field]: value }))

  const guardar = async () => {
    if (!motivo.trim() || lineas.length === 0) return
    await invoke('ajustes:crear', { ajuste: { tipo, motivo: motivo.trim(), fecha }, lineas })
    setModal(false); reset(); cargar()
  }

  const verDetalle = async (id: number) => {
    const d = await invoke<{ ajuste: AjusteInventario; lineas: AjusteInventarioLinea[] }>('ajustes:obtener', id)
    setDetalle(d); setDetalleModal(true)
  }

  const descripcionTipo = {
    ENTRADA: 'Suma stock (mercadería recibida, devolución, etc.)',
    SALIDA: 'Resta stock (merma, rotura, pérdida, etc.)',
    CORRECCION: 'Establece el stock en un valor exacto (inventario físico)',
  }

  return (
    <div className="p-6">
      <PageHeader title="Ajustes de Inventario" subtitle="Entradas, salidas y correcciones de stock">
        <button onClick={() => setModal(true)} className="btn btn-primary flex items-center gap-2">
          <Plus size={16} /> Nuevo ajuste
        </button>
      </PageHeader>

      {items.length === 0
        ? <EmptyState icon={ClipboardEdit} title="Sin ajustes" description="Registrá el primer ajuste de inventario." />
        : (
          <div className="card overflow-hidden">
            <table className="table">
              <thead>
                <tr><th>Fecha</th><th>Tipo</th><th>Motivo</th><th>Acciones</th></tr>
              </thead>
              <tbody>
                {items.map(a => (
                  <tr key={a.id}>
                    <td className="text-gray-400 text-sm">{a.fecha}</td>
                    <td><span className={`badge ${TIPO_BADGE[a.tipo]}`}>{TIPO_LABEL[a.tipo]}</span></td>
                    <td className="font-medium">{a.motivo}</td>
                    <td>
                      <button onClick={() => verDetalle(a.id)} className="btn-icon text-gray-400 hover:text-white"><Eye size={15} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }

      {/* Modal crear */}
      <Modal open={modal} onClose={() => { setModal(false); reset() }} title="Nuevo ajuste de inventario">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Tipo *</label>
              <select className="input" value={tipo} onChange={e => setTipo(e.target.value as TipoAjuste)}>
                <option value="ENTRADA">Entrada</option>
                <option value="SALIDA">Salida</option>
                <option value="CORRECCION">Corrección</option>
              </select>
            </div>
            <div>
              <label className="label">Fecha</label>
              <input type="date" className="input" value={fecha} onChange={e => setFecha(e.target.value)} />
            </div>
          </div>
          <p className="text-xs text-gray-500">{descripcionTipo[tipo]}</p>
          <div>
            <label className="label">Motivo *</label>
            <input className="input" placeholder="Ej: Inventario físico enero, rotura de stock..." value={motivo} onChange={e => setMotivo(e.target.value)} />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Productos</label>
              <button onClick={agregarLinea} className="btn btn-secondary text-xs py-1 px-2">+ Agregar</button>
            </div>
            {lineas.length === 0 && <p className="text-gray-500 text-sm">Agregá al menos un producto.</p>}
            <div className="space-y-2">
              {lineas.map((l, i) => {
                const prod = productos.find(p => p.id === l.producto_id)
                return (
                  <div key={i} className="flex gap-2 items-center">
                    <select className="input flex-1" value={l.producto_id} onChange={e => actualizarLinea(i, 'producto_id', +e.target.value)}>
                      {productos.map(p => <option key={p.id} value={p.id}>{p.codigo} - {p.descripcion}</option>)}
                    </select>
                    <div className="text-xs text-gray-500 whitespace-nowrap">Stock: {prod?.stock ?? '—'}</div>
                    <input type="number" min="0" step="0.01" className="input w-24"
                      placeholder={tipo === 'CORRECCION' ? 'Nuevo valor' : 'Cantidad'}
                      value={l.cantidad_ajuste}
                      onChange={e => actualizarLinea(i, 'cantidad_ajuste', +e.target.value)} />
                    <button onClick={() => setLineas(prev => prev.filter((_, j) => j !== i))} className="btn-icon text-gray-500 hover:text-red-400"><X size={14} /></button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button className="btn btn-secondary" onClick={() => { setModal(false); reset() }}>Cancelar</button>
          <button className="btn btn-primary" onClick={guardar}>Confirmar ajuste</button>
        </div>
      </Modal>

      {/* Modal detalle */}
      <Modal open={detalleModal} onClose={() => setDetalleModal(false)} title="Detalle del ajuste">
        {detalle && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-400">Tipo:</span> <span className={`badge ml-1 ${TIPO_BADGE[detalle.ajuste.tipo]}`}>{TIPO_LABEL[detalle.ajuste.tipo]}</span></div>
              <div><span className="text-gray-400">Fecha:</span> <span className="text-gray-100">{detalle.ajuste.fecha}</span></div>
              <div className="col-span-2"><span className="text-gray-400">Motivo:</span> <span className="text-gray-100">{detalle.ajuste.motivo}</span></div>
            </div>
            <table className="table text-sm mt-3">
              <thead>
                <tr><th>Código</th><th>Producto</th><th className="text-right">Anterior</th><th className="text-right">Ajuste</th><th className="text-right">Nuevo</th></tr>
              </thead>
              <tbody>
                {detalle.lineas.map(l => (
                  <tr key={l.id}>
                    <td className="font-mono text-xs text-gray-400">{l.producto_codigo}</td>
                    <td>{l.producto_descripcion}</td>
                    <td className="text-right text-gray-400">{l.cantidad_anterior}</td>
                    <td className={`text-right font-medium ${detalle.ajuste.tipo === 'SALIDA' ? 'text-red-400' : 'text-green-400'}`}>
                      {detalle.ajuste.tipo === 'SALIDA' ? '-' : detalle.ajuste.tipo === 'ENTRADA' ? '+' : '='}{l.cantidad_ajuste}
                    </td>
                    <td className="text-right font-bold text-gray-100">{l.cantidad_nueva}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>
    </div>
  )
}
