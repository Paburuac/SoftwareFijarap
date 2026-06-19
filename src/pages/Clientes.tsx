import { useEffect, useState } from 'react'
import { invoke } from '../api'
import type { Cliente, TipoCliente } from '../../shared/types'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'
import EmptyState from '../components/EmptyState'
import { Plus, Users, Pencil, Search, Phone, Mail } from 'lucide-react'

const TIPOS: TipoCliente[] = ['MINORISTA', 'MAYORISTA', 'DISTRIBUIDORA']
const TIPO_BADGE: Record<TipoCliente, string> = { MINORISTA: 'badge-gray', MAYORISTA: 'badge-blue', DISTRIBUIDORA: 'badge-orange' }

const EMPTY: Omit<Cliente, 'id' | 'creado_en'> = {
  razon_social: '', cuit: '', telefono: '', email: '', direccion: '', tipo: 'MINORISTA', descuento: 0, activo: 1,
}

export default function Clientes() {
  const [items, setItems] = useState<Cliente[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [tipoFiltro, setTipoFiltro] = useState<TipoCliente | 'TODOS'>('TODOS')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [editId, setEditId] = useState<number | null>(null)

  const cargar = () => invoke<Cliente[]>('clientes:listar').then(setItems)
  useEffect(() => { cargar() }, [])

  const filtrados = items.filter(c => {
    const matchTipo = tipoFiltro === 'TODOS' || c.tipo === tipoFiltro
    const matchBusq = !busqueda || c.razon_social.toLowerCase().includes(busqueda.toLowerCase()) || c.cuit.includes(busqueda)
    return matchTipo && matchBusq
  })

  const abrirNuevo = () => { setForm(EMPTY); setEditId(null); setModal(true) }
  const abrirEditar = (c: Cliente) => {
    const { id, creado_en, ...rest } = c
    setForm(rest); setEditId(id); setModal(true)
  }
  const guardar = async () => {
    if (editId) await invoke('clientes:actualizar', { ...form, id: editId })
    else await invoke('clientes:crear', form)
    setModal(false); cargar()
  }
  const f = (field: keyof typeof form, value: string | number) =>
    setForm(prev => ({ ...prev, [field]: value }))

  return (
    <div className="p-8">
      <PageHeader
        title="Clientes"
        subtitle={`${items.length} clientes`}
        action={<button className="btn-primary" onClick={abrirNuevo}><Plus size={16} /> Nuevo cliente</button>}
      />
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input className="input pl-8" placeholder="Buscar..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        </div>
        <div className="flex gap-1">
          {(['TODOS', ...TIPOS] as const).map(t => (
            <button key={t} onClick={() => setTipoFiltro(t)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${tipoFiltro === t ? 'bg-primary-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-200'}`}>
              {t === 'TODOS' ? 'Todos' : t.charAt(0) + t.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {filtrados.length === 0 ? (
        <EmptyState icon={Users} title="No hay clientes" action={<button className="btn-primary" onClick={abrirNuevo}><Plus size={16} /> Nuevo</button>} />
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-left">
                <th className="px-4 py-3 text-gray-500 font-medium">Razón Social</th>
                <th className="px-4 py-3 text-gray-500 font-medium">CUIT</th>
                <th className="px-4 py-3 text-gray-500 font-medium">Tipo</th>
                <th className="px-4 py-3 text-gray-500 font-medium text-right">Descuento</th>
                <th className="px-4 py-3 text-gray-500 font-medium">Contacto</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map(c => (
                <tr key={c.id} className="border-b border-gray-800/50 table-row-hover">
                  <td className="px-4 py-3 text-gray-200 font-medium">{c.razon_social}</td>
                  <td className="px-4 py-3 text-gray-400 font-mono text-xs">{c.cuit || '—'}</td>
                  <td className="px-4 py-3"><span className={TIPO_BADGE[c.tipo]}>{c.tipo.charAt(0)+c.tipo.slice(1).toLowerCase()}</span></td>
                  <td className="px-4 py-3 text-right text-gray-300">{c.descuento > 0 ? `${c.descuento}%` : '—'}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    <div className="flex flex-col gap-0.5">
                      {c.telefono && <span className="flex items-center gap-1"><Phone size={10} />{c.telefono}</span>}
                      {c.email && <span className="flex items-center gap-1"><Mail size={10} />{c.email}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button className="btn-ghost p-1.5" onClick={() => abrirEditar(c)}><Pencil size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modal} title={editId ? 'Editar cliente' : 'Nuevo cliente'} onClose={() => setModal(false)}>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="label">Razón social *</label>
            <input className="input" value={form.razon_social} onChange={e => f('razon_social', e.target.value)} />
          </div>
          <div>
            <label className="label">CUIT</label>
            <input className="input" value={form.cuit} onChange={e => f('cuit', e.target.value)} />
          </div>
          <div>
            <label className="label">Tipo de cliente</label>
            <select className="input" value={form.tipo} onChange={e => f('tipo', e.target.value)}>
              {TIPOS.map(t => <option key={t} value={t}>{t.charAt(0)+t.slice(1).toLowerCase()}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Descuento (%)</label>
            <input className="input" type="number" min="0" max="100" value={form.descuento} onChange={e => f('descuento', +e.target.value)} />
          </div>
          <div>
            <label className="label">Teléfono</label>
            <input className="input" value={form.telefono} onChange={e => f('telefono', e.target.value)} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={form.email} onChange={e => f('email', e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className="label">Dirección</label>
            <input className="input" value={form.direccion} onChange={e => f('direccion', e.target.value)} />
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
