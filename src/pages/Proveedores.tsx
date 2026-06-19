import { useEffect, useState } from 'react'
import { invoke } from '../api'
import type { Proveedor } from '../../shared/types'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'
import EmptyState from '../components/EmptyState'
import { Plus, Truck, Pencil, Search, Phone, Mail } from 'lucide-react'

const EMPTY: Omit<Proveedor, 'id' | 'creado_en'> = {
  razon_social: '', cuit: '', telefono: '', email: '', direccion: '', condicion_pago: 'Contado', activo: 1,
}

export default function Proveedores() {
  const [items, setItems] = useState<Proveedor[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [editId, setEditId] = useState<number | null>(null)

  const cargar = () => invoke<Proveedor[]>('proveedores:listar').then(setItems)
  useEffect(() => { cargar() }, [])

  const filtrados = items.filter(i =>
    !busqueda || i.razon_social.toLowerCase().includes(busqueda.toLowerCase()) || i.cuit.includes(busqueda)
  )

  const abrirNuevo = () => { setForm(EMPTY); setEditId(null); setModal(true) }
  const abrirEditar = (p: Proveedor) => {
    const { id, creado_en, ...rest } = p
    setForm(rest); setEditId(id); setModal(true)
  }
  const guardar = async () => {
    if (editId) await invoke('proveedores:actualizar', { ...form, id: editId })
    else await invoke('proveedores:crear', form)
    setModal(false); cargar()
  }
  const f = (field: keyof typeof form, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }))

  return (
    <div className="p-8">
      <PageHeader
        title="Proveedores"
        subtitle={`${items.length} proveedores`}
        action={<button className="btn-primary" onClick={abrirNuevo}><Plus size={16} /> Nuevo proveedor</button>}
      />
      <div className="relative max-w-xs mb-5">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input className="input pl-8" placeholder="Buscar..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
      </div>
      {filtrados.length === 0 ? (
        <EmptyState icon={Truck} title="No hay proveedores" description="Registrá los proveedores de materia prima." action={<button className="btn-primary" onClick={abrirNuevo}><Plus size={16} /> Nuevo</button>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtrados.map(p => (
            <div key={p.id} className="card flex flex-col gap-2">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium text-gray-100">{p.razon_social}</div>
                  <div className="text-xs text-gray-500 mt-0.5">CUIT: {p.cuit || '—'}</div>
                </div>
                <button className="btn-ghost p-1.5" onClick={() => abrirEditar(p)}><Pencil size={14} /></button>
              </div>
              {p.telefono && <div className="flex items-center gap-2 text-xs text-gray-400"><Phone size={12} />{p.telefono}</div>}
              {p.email && <div className="flex items-center gap-2 text-xs text-gray-400"><Mail size={12} />{p.email}</div>}
              {p.condicion_pago && <div className="text-xs text-gray-500">{p.condicion_pago}</div>}
            </div>
          ))}
        </div>
      )}
      <Modal open={modal} title={editId ? 'Editar proveedor' : 'Nuevo proveedor'} onClose={() => setModal(false)}>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="label">Razón social *</label>
            <input className="input" value={form.razon_social} onChange={e => f('razon_social', e.target.value)} />
          </div>
          <div>
            <label className="label">CUIT</label>
            <input className="input" value={form.cuit} onChange={e => f('cuit', e.target.value)} placeholder="20-12345678-9" />
          </div>
          <div>
            <label className="label">Condición de pago</label>
            <input className="input" value={form.condicion_pago} onChange={e => f('condicion_pago', e.target.value)} placeholder="Contado, 30 días..." />
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
