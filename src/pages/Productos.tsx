import { useEffect, useState } from 'react'
import { invoke } from '../api'
import type { Producto, CategoriaProducto } from '../../shared/types'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'
import EmptyState from '../components/EmptyState'
import { Plus, Package, Pencil, Search } from 'lucide-react'

const CATEGORIAS: CategoriaProducto[] = ['FRO', 'CR', 'FIJACION']
const CAT_LABEL: Record<CategoriaProducto, string> = { FRO: 'Artículos de Goma', CR: 'Sanitario', FIJACION: 'Fijaciones' }
const CAT_BADGE: Record<CategoriaProducto, string> = { FRO: 'badge-orange', CR: 'badge-blue', FIJACION: 'badge-gray' }

const EMPTY: Omit<Producto, 'id' | 'creado_en'> = {
  codigo: '', descripcion: '', categoria: 'FRO', stock: 0, stock_minimo: 10,
  precio_minorista: 0, precio_mayorista: 0, precio_distribuidora: 0, unidad: 'UN', activo: 1,
}

export default function Productos() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [catFiltro, setCatFiltro] = useState<CategoriaProducto | 'TODOS'>('TODOS')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<Omit<Producto, 'id' | 'creado_en'>>(EMPTY)
  const [editId, setEditId] = useState<number | null>(null)

  const cargar = () => invoke<Producto[]>('productos:listar').then(setProductos)
  useEffect(() => { cargar() }, [])

  const filtrados = productos.filter(p => {
    const matchCat = catFiltro === 'TODOS' || p.categoria === catFiltro
    const matchBusq = !busqueda || p.codigo.toLowerCase().includes(busqueda.toLowerCase()) || p.descripcion.toLowerCase().includes(busqueda.toLowerCase())
    return matchCat && matchBusq
  })

  const abrirNuevo = () => { setForm(EMPTY); setEditId(null); setModal(true) }
  const abrirEditar = (p: Producto) => {
    const { id, creado_en, ...rest } = p
    setForm(rest); setEditId(id); setModal(true)
  }

  const guardar = async () => {
    if (editId) {
      await invoke('productos:actualizar', { ...form, id: editId })
    } else {
      await invoke('productos:crear', form)
    }
    setModal(false)
    cargar()
  }

  const f = (field: keyof typeof form, value: string | number) =>
    setForm(prev => ({ ...prev, [field]: value }))

  return (
    <div className="p-8">
      <PageHeader
        title="Productos"
        subtitle={`${productos.length} productos en catálogo`}
        action={
          <button className="btn-primary" onClick={abrirNuevo}>
            <Plus size={16} /> Nuevo producto
          </button>
        }
      />

      {/* Filtros */}
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            className="input pl-8"
            placeholder="Buscar por código o descripción..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
        </div>
        <div className="flex gap-1">
          {(['TODOS', ...CATEGORIAS] as const).map(cat => (
            <button
              key={cat}
              onClick={() => setCatFiltro(cat)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${catFiltro === cat ? 'bg-primary-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-200'}`}
            >
              {cat === 'TODOS' ? 'Todos' : CAT_LABEL[cat]}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      {filtrados.length === 0 ? (
        <EmptyState icon={Package} title="No hay productos" description="Agregá tu primer producto al catálogo." action={<button className="btn-primary" onClick={abrirNuevo}><Plus size={16} /> Nuevo producto</button>} />
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-left">
                <th className="px-4 py-3 text-gray-500 font-medium">Código</th>
                <th className="px-4 py-3 text-gray-500 font-medium">Descripción</th>
                <th className="px-4 py-3 text-gray-500 font-medium">Categoría</th>
                <th className="px-4 py-3 text-gray-500 font-medium text-right">Stock</th>
                <th className="px-4 py-3 text-gray-500 font-medium text-right">P. Minorista</th>
                <th className="px-4 py-3 text-gray-500 font-medium text-right">P. Mayorista</th>
                <th className="px-4 py-3 text-gray-500 font-medium text-right">P. Distrib.</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map(p => (
                <tr key={p.id} className="border-b border-gray-800/50 table-row-hover">
                  <td className="px-4 py-3 font-mono text-primary-400 text-xs">{p.codigo}</td>
                  <td className="px-4 py-3 text-gray-200">{p.descripcion}</td>
                  <td className="px-4 py-3"><span className={CAT_BADGE[p.categoria]}>{CAT_LABEL[p.categoria]}</span></td>
                  <td className={`px-4 py-3 text-right font-medium ${p.stock <= p.stock_minimo ? 'text-red-400' : 'text-gray-200'}`}>
                    {p.stock} {p.unidad}
                    {p.stock <= p.stock_minimo && <span className="ml-1 text-red-400 text-xs">⚠</span>}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-300">${p.precio_minorista.toLocaleString('es-AR')}</td>
                  <td className="px-4 py-3 text-right text-gray-300">${p.precio_mayorista.toLocaleString('es-AR')}</td>
                  <td className="px-4 py-3 text-right text-gray-300">${p.precio_distribuidora.toLocaleString('es-AR')}</td>
                  <td className="px-4 py-3 text-right">
                    <button className="btn-ghost p-1.5" onClick={() => abrirEditar(p)}>
                      <Pencil size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      <Modal open={modal} title={editId ? 'Editar producto' : 'Nuevo producto'} onClose={() => setModal(false)} size="lg">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Código *</label>
            <input className="input" value={form.codigo} onChange={e => f('codigo', e.target.value)} />
          </div>
          <div>
            <label className="label">Categoría *</label>
            <select className="input" value={form.categoria} onChange={e => f('categoria', e.target.value as CategoriaProducto)}>
              {CATEGORIAS.map(c => <option key={c} value={c}>{CAT_LABEL[c]}</option>)}
            </select>
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
          <div>
            <label className="label">Unidad</label>
            <input className="input" value={form.unidad} onChange={e => f('unidad', e.target.value)} />
          </div>
          <div />
          <div>
            <label className="label">Precio Minorista</label>
            <input className="input" type="number" value={form.precio_minorista} onChange={e => f('precio_minorista', +e.target.value)} />
          </div>
          <div>
            <label className="label">Precio Mayorista</label>
            <input className="input" type="number" value={form.precio_mayorista} onChange={e => f('precio_mayorista', +e.target.value)} />
          </div>
          <div>
            <label className="label">Precio Distribuidora</label>
            <input className="input" type="number" value={form.precio_distribuidora} onChange={e => f('precio_distribuidora', +e.target.value)} />
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
