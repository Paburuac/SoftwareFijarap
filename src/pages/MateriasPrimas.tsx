import { useEffect, useState } from 'react'
import { invoke } from '../api'
import type { MateriaPrima } from '../../shared/types'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'
import EmptyState from '../components/EmptyState'
import ImagePicker from '../components/ImagePicker'
import { Plus, Layers, Pencil, Search } from 'lucide-react'

const EMPTY: Omit<MateriaPrima, 'id' | 'creado_en'> = {
  codigo: '', descripcion: '', unidad: 'KG', stock: 0, stock_minimo: 5, precio_referencia: 0, imagen: '', activo: 1,
}

export default function MateriasPrimas() {
  const [items, setItems] = useState<MateriaPrima[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [editId, setEditId] = useState<number | null>(null)

  const cargar = () => invoke<MateriaPrima[]>('materias-primas:listar').then(setItems)
  useEffect(() => { cargar() }, [])

  const filtrados = items.filter(i =>
    !busqueda || i.codigo.toLowerCase().includes(busqueda.toLowerCase()) || i.descripcion.toLowerCase().includes(busqueda.toLowerCase())
  )

  const abrirNuevo = () => { setForm(EMPTY); setEditId(null); setModal(true) }
  const abrirEditar = (mp: MateriaPrima) => {
    const { id, creado_en, ...rest } = mp
    setForm(rest); setEditId(id); setModal(true)
  }

  const guardar = async () => {
    if (editId) await invoke('materias-primas:actualizar', { ...form, id: editId })
    else await invoke('materias-primas:crear', form)
    setModal(false); cargar()
  }

  const f = (field: keyof typeof form, value: string | number) =>
    setForm(prev => ({ ...prev, [field]: value }))

  return (
    <div className="p-8">
      <PageHeader
        title="Materias Primas"
        subtitle={`${items.length} materiales registrados`}
        action={<button className="btn-primary" onClick={abrirNuevo}><Plus size={16} /> Nueva materia prima</button>}
      />

      <div className="relative max-w-xs mb-5">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
        <input className="input pl-8" placeholder="Buscar..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
      </div>

      {filtrados.length === 0 ? (
        <EmptyState icon={Layers} title="No hay materias primas" description="Registrá los insumos que usás en la fabricación."
          action={<button className="btn-primary" onClick={abrirNuevo}><Plus size={16} /> Nueva</button>} />
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 48 }}></th>
                <th>Código</th>
                <th>Descripción</th>
                <th className="text-right">Stock</th>
                <th className="text-right">Stock mín.</th>
                <th className="text-right">Precio ref.</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map(mp => (
                <tr key={mp.id}>
                  <td className="px-2">
                    {mp.imagen
                      ? <img src={mp.imagen} alt="" className="w-9 h-9 object-cover rounded-md border border-[var(--border)]" />
                      : <div className="w-9 h-9 rounded-md flex items-center justify-center" style={{ backgroundColor: 'var(--bg-input)' }}>
                          <Layers size={16} style={{ color: 'var(--text-muted)' }} />
                        </div>
                    }
                  </td>
                  <td className="font-mono text-primary-400 text-xs">{mp.codigo}</td>
                  <td>{mp.descripcion}</td>
                  <td className={`text-right font-medium ${mp.stock <= mp.stock_minimo ? 'text-red-400' : ''}`}>
                    {mp.stock} {mp.unidad}
                    {mp.stock <= mp.stock_minimo && <span className="ml-1">⚠</span>}
                  </td>
                  <td className="text-right" style={{ color: 'var(--text-secondary)' }}>{mp.stock_minimo} {mp.unidad}</td>
                  <td className="text-right">${mp.precio_referencia.toLocaleString('es-AR')}</td>
                  <td className="text-right">
                    <button className="btn-ghost p-1.5" onClick={() => abrirEditar(mp)}><Pencil size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modal} title={editId ? 'Editar materia prima' : 'Nueva materia prima'} onClose={() => setModal(false)}>
        <div className="flex gap-5">
          <div className="flex flex-col items-center gap-2 pt-1">
            <ImagePicker value={form.imagen} onChange={v => f('imagen', v)} />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>PNG / JPG</span>
          </div>

          <div className="flex-1 grid grid-cols-2 gap-4">
            <div>
              <label className="label">Código *</label>
              <input className="input" value={form.codigo} onChange={e => f('codigo', e.target.value)} />
            </div>
            <div>
              <label className="label">Unidad</label>
              <input className="input" value={form.unidad} onChange={e => f('unidad', e.target.value)} placeholder="KG, LT, UN..." />
            </div>
            <div className="col-span-2">
              <label className="label">Descripción *</label>
              <input className="input" value={form.descripcion} onChange={e => f('descripcion', e.target.value)} />
            </div>
            <div>
              <label className="label">Stock actual</label>
              <input className="input" type="number" value={form.stock} onChange={e => f('stock', +e.target.value)} />
            </div>
            <div>
              <label className="label">Stock mínimo</label>
              <input className="input" type="number" value={form.stock_minimo} onChange={e => f('stock_minimo', +e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="label">Precio de referencia</label>
              <input className="input" type="number" value={form.precio_referencia} onChange={e => f('precio_referencia', +e.target.value)} />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button className="btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
          <button className="btn-primary" onClick={guardar}>Guardar</button>
        </div>
      </Modal>
    </div>
  )
}
