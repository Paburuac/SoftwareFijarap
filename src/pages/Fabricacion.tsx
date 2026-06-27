import { useEffect, useState } from 'react'
import { invoke } from '../api'
import type { MateriaPrima, OrdenFabricacion, OrdenFabricacionInsumo, Producto } from '../../shared/types'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'
import EmptyState from '../components/EmptyState'
import { Plus, Factory, Eye, ChevronRight, Trash2 } from 'lucide-react'

const ETAPAS = ['INYECCION', 'FABRICACION', 'ENVASADO', 'COMPLETADO']
const ETAPA_LABEL: Record<string, string> = { INYECCION: 'Inyección', FABRICACION: 'Fabricación', ENVASADO: 'Envasado', COMPLETADO: 'Completado' }
const ESTADO_BADGE: Record<string, string> = { PENDIENTE: 'badge-gray', EN_PROCESO: 'badge-blue', COMPLETADA: 'badge-green', CANCELADA: 'badge-red' }
const ESTADO_LABEL: Record<string, string> = { PENDIENTE: 'Pendiente', EN_PROCESO: 'En proceso', COMPLETADA: 'Completada', CANCELADA: 'Cancelada' }

export default function Fabricacion() {
  const [items, setItems] = useState<OrdenFabricacion[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [materias, setMaterias] = useState<MateriaPrima[]>([])
  const [modal, setModal] = useState(false)
  const [detalleModal, setDetalleModal] = useState(false)
  const [detalle, setDetalle] = useState<{ orden: OrdenFabricacion; insumos: OrdenFabricacionInsumo[] } | null>(null)

  const [productoId, setProductoId] = useState('')
  const [cantidad, setCantidad] = useState(1)
  const [notas, setNotas] = useState('')
  const [insumos, setInsumos] = useState<{ materia_prima_id: number; cantidad_necesaria: number; cantidad_usada: number }[]>([])

  const cargar = () => invoke<OrdenFabricacion[]>('fabricacion:listar').then(setItems)
  useEffect(() => {
    cargar()
    invoke<Producto[]>('productos:listar').then(setProductos)
    invoke<MateriaPrima[]>('materias-primas:listar').then(setMaterias)
  }, [])

  const agregarInsumo = () => {
    const mp = materias[0]; if (!mp) return
    setInsumos(prev => [...prev, { materia_prima_id: mp.id, cantidad_necesaria: 1, cantidad_usada: 0 }])
  }

  const guardar = async () => {
    if (!productoId) return
    await invoke('fabricacion:crear', {
      orden: {
        producto_id: +productoId, cantidad, etapa: 'INYECCION', estado: 'PENDIENTE',
        fecha_inicio: new Date().toISOString().slice(0, 10), fecha_fin: null, notas,
      },
      insumos,
    })
    setModal(false); cargar()
  }

  const verDetalle = async (id: number) => {
    const data = await invoke<{ orden: OrdenFabricacion; insumos: OrdenFabricacionInsumo[] }>('fabricacion:obtener', id)
    setDetalle(data); setDetalleModal(true)
  }

  const avanzar = async (id: number) => {
    await invoke('fabricacion:avanzar-etapa', id); cargar()
  }

  return (
    <div className="p-8">
      <PageHeader
        title="Fabricación"
        subtitle="Órdenes de producción: inyección → fabricación → envasado"
        action={<button className="btn-primary" onClick={() => { setInsumos([]); setProductoId(''); setCantidad(1); setNotas(''); setModal(true) }}><Plus size={16} /> Nueva orden</button>}
      />

      {items.length === 0 ? (
        <EmptyState icon={Factory} title="No hay órdenes de fabricación" />
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="px-4 py-3 text-gray-500 font-medium">Número</th>
                <th className="px-4 py-3 text-gray-500 font-medium">Producto</th>
                <th className="px-4 py-3 text-gray-500 font-medium text-right">Cantidad</th>
                <th className="px-4 py-3 text-gray-500 font-medium">Etapa</th>
                <th className="px-4 py-3 text-gray-500 font-medium">Estado</th>
                <th className="px-4 py-3 text-gray-500 font-medium">Inicio</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.map(o => (
                <tr key={o.id} className="border-b border-gray-800/50 table-row-hover">
                  <td className="px-4 py-3 font-mono text-primary-400 text-xs">{o.numero}</td>
                  <td className="px-4 py-3 text-gray-200 text-xs">
                    <div className="font-medium">{o.producto_codigo}</div>
                    <div className="text-gray-500">{o.producto_descripcion}</div>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-300">{o.cantidad}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {ETAPAS.slice(0, -1).map((etapa, i) => (
                        <div key={etapa} className="flex items-center gap-1">
                          <div className={`text-xs px-1.5 py-0.5 rounded ${o.etapa === etapa ? 'bg-primary-600 text-white' : ETAPAS.indexOf(o.etapa) > i ? 'bg-green-800 text-green-300' : 'bg-gray-800 text-gray-500'}`}>
                            {ETAPA_LABEL[etapa].slice(0, 3)}
                          </div>
                          {i < 2 && <ChevronRight size={10} className="text-gray-600" />}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3"><span className={ESTADO_BADGE[o.estado]}>{ESTADO_LABEL[o.estado]}</span></td>
                  <td className="px-4 py-3 text-gray-400">{o.fecha_inicio}</td>
                  <td className="px-4 py-3 text-right flex items-center justify-end gap-1">
                    <button className="btn-ghost p-1.5" onClick={() => verDetalle(o.id)}><Eye size={14} /></button>
                    {o.estado !== 'COMPLETADA' && o.estado !== 'CANCELADA' && (
                      <button className="btn-ghost p-1.5 text-primary-400" title="Avanzar etapa" onClick={() => avanzar(o.id)}>
                        <ChevronRight size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal nueva orden */}
      <Modal open={modal} title="Nueva orden de fabricación" onClose={() => setModal(false)} size="lg">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="col-span-2">
            <label className="label">Producto a fabricar *</label>
            <select className="input" value={productoId} onChange={e => setProductoId(e.target.value)}>
              <option value="">Seleccionar producto...</option>
              {productos.map(p => <option key={p.id} value={p.id}>{p.codigo} - {p.descripcion}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Cantidad a producir</label>
            <input className="input" type="number" min="1" value={cantidad} onChange={e => setCantidad(+e.target.value)} />
          </div>
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="label">Insumos necesarios (materias primas)</label>
            <button className="btn-ghost text-xs py-1 px-2" onClick={agregarInsumo} disabled={materias.length === 0}><Plus size={12} /> Agregar</button>
          </div>
          {materias.length === 0 && <p className="text-xs text-yellow-500 mb-2">No hay materias primas registradas. Agregá primero en el módulo Mat. Primas.</p>}
          <div className="space-y-2">
            {insumos.map((ins, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-8">
                  <select className="input text-xs" value={ins.materia_prima_id} onChange={e => setInsumos(prev => prev.map((x, j) => j === i ? { ...x, materia_prima_id: +e.target.value } : x))}>
                    {materias.map(m => <option key={m.id} value={m.id}>{m.codigo} - {m.descripcion}</option>)}
                  </select>
                </div>
                <div className="col-span-3">
                  <input className="input text-xs" type="number" placeholder="Cantidad" value={ins.cantidad_necesaria} onChange={e => setInsumos(prev => prev.map((x, j) => j === i ? { ...x, cantidad_necesaria: +e.target.value } : x))} />
                </div>
                <div className="col-span-1 text-right">
                  <button className="btn-ghost p-1" onClick={() => setInsumos(prev => prev.filter((_, j) => j !== i))}><Trash2 size={12} /></button>
                </div>
              </div>
            ))}
            {insumos.length === 0 && <div className="text-center py-4 text-sm" style={{color:'var(--text-muted)'}}>Sin insumos definidos (opcional)</div>}
          </div>
        </div>

        <div>
          <label className="label">Notas</label>
          <textarea className="input h-16 resize-none" value={notas} onChange={e => setNotas(e.target.value)} />
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button className="btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
          <button className="btn-primary" onClick={guardar} disabled={!productoId}>Crear orden</button>
        </div>
      </Modal>

      {/* Modal detalle */}
      <Modal open={detalleModal} title={`Orden ${detalle?.orden.numero}`} onClose={() => setDetalleModal(false)} size="lg">
        {detalle && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-gray-500">Producto:</span> <span className="text-gray-200">{detalle.orden.producto_codigo}</span></div>
              <div><span className="text-gray-500">Cantidad:</span> <span className="text-gray-200">{detalle.orden.cantidad}</span></div>
              <div><span className="text-gray-500">Etapa actual:</span> <span className="text-primary-400">{ETAPA_LABEL[detalle.orden.etapa]}</span></div>
              <div><span className="text-gray-500">Estado:</span> <span className={ESTADO_BADGE[detalle.orden.estado]}>{ESTADO_LABEL[detalle.orden.estado]}</span></div>
              <div><span className="text-gray-500">Inicio:</span> <span className="text-gray-200">{detalle.orden.fecha_inicio}</span></div>
              {detalle.orden.fecha_fin && <div><span className="text-gray-500">Fin:</span> <span className="text-gray-200">{detalle.orden.fecha_fin}</span></div>}
            </div>
            {detalle.insumos.length > 0 && (
              <table className="w-full text-xs">
                <thead><tr className="border-b border-gray-800"><th className="text-left py-2 text-gray-500">Insumo</th><th className="text-right py-2 text-gray-500">Necesario</th><th className="text-right py-2 text-gray-500">Usado</th></tr></thead>
                <tbody>
                  {detalle.insumos.map(ins => (
                    <tr key={ins.id} className="border-b border-gray-800/40">
                      <td className="py-2 text-gray-300">{ins.materia_prima_descripcion}</td>
                      <td className="py-2 text-right text-gray-400">{ins.cantidad_necesaria}</td>
                      <td className="py-2 text-right text-gray-400">{ins.cantidad_usada}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {detalle.orden.estado !== 'COMPLETADA' && detalle.orden.estado !== 'CANCELADA' && (
              <div className="flex justify-end">
                <button className="btn-primary" onClick={async () => { await invoke('fabricacion:avanzar-etapa', detalle.orden.id); setDetalleModal(false); cargar() }}>
                  <ChevronRight size={14} /> Avanzar a siguiente etapa
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
