import { useEffect, useState } from 'react'
import { invoke } from '../api'
import type { MateriaPrima } from '../../shared/types'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'
import EmptyState from '../components/EmptyState'
import { Plus, Layers, Pencil, Search } from 'lucide-react'

const EMPTY: Omit<MateriaPrima, 'id' | 'creado_en'> = {
  codigo: '', descripcion: '', unidad: 'KG', stock: 0, stock_minimo: 5, precio_referencia: 0, activo: 1,
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
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input className="input pl-8" placeholder="Buscar..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
      </div>

      {filtrados.length === 0 ? (
        <EmptyState icon={Layers} title="No hay materias primas" description="Registrá los insumos que usás en la fabricación." action={<button className="btn-primary" onClick={abrirNuevo}><Plus size={16} /> Nueva</button>} />
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-left">
                <th className="px-4 py-3 text-gray-500 font-medium">Código</th>
                <th className="px-4 py-3 text-gray-500 font-medium">Descripción</th>
                <th className="px-4 py-3 text-gray-500 font-medium text-right">Stock</th>
                <th className="px-4 py-3 text-gray-500 font-medium text-right">Stock mín.</th>
                <th className="px-4 py-3 text-gray-500 font-medium text-right">Precio ref.</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map(mp => (
                <tr key={mp.id} className="border-b border-gray-800/50 table-row-hover">
                  <td className="px-4 py-3 font-mono text-primary-400 text-xs">{mp.codigo}</td>
                  <td className="px-4 py-3 text-gray-200">{mp.descripcion}</td>
                  <td className={`px-4 py-3 text-right font-medium ${mp.stock <= mp.stock_minimo ? 'text-red-400' : 'text-gray-200'}`}>
                    {mp.stock} {mp.unidad}
                    {mp.stock <= mp.stock_minimo && <span className="ml-1">⚠</span>}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-400">{mp.stock_minimo} {mp.unidad}</td>
                  <td className="px-4 py-3 text-right text-gray-300">${mp.precio_referencia.toLocaleString('es-AR')}</td>
                  <td className="px-4 py-3 text-right">
                    <button className="btn-ghost p-1.5" onClick={() => abrirEditar(mp)}><Pencil size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modal} title={editId ? 'Editar materia prima' : 'Nueva materia prima'} onClose={() => setModal(false)}>
        <div className="grid grid-cols-2 gap-4">
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
        <div className="flex justify-end gap-3 mt-6">
          <button className="btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
          <button className="btn-primary" onClick={guardar}>Guardar</button>
        </div>
      </Modal>
    </div>
  )
}
