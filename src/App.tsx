import { HashRouter, Routes, Route, NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Package, Layers, Truck, Users,
  FileText, Receipt, ShoppingCart, Factory, Bell,
} from 'lucide-react'
import Dashboard from './pages/Dashboard'
import Productos from './pages/Productos'
import MateriasPrimas from './pages/MateriasPrimas'
import Proveedores from './pages/Proveedores'
import Clientes from './pages/Clientes'
import Presupuestos from './pages/Presupuestos'
import Facturas from './pages/Facturas'
import OrdenesCompra from './pages/OrdenesCompra'
import Fabricacion from './pages/Fabricacion'
import Notificaciones from './pages/Notificaciones'

const nav = [
  { to: '/',               icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/productos',      icon: Package,          label: 'Productos' },
  { to: '/materias-primas',icon: Layers,           label: 'Mat. Primas' },
  { to: '/proveedores',    icon: Truck,            label: 'Proveedores' },
  { to: '/clientes',       icon: Users,            label: 'Clientes' },
  { to: '/presupuestos',   icon: FileText,         label: 'Presupuestos' },
  { to: '/facturas',       icon: Receipt,          label: 'Facturas' },
  { to: '/compras',        icon: ShoppingCart,     label: 'Compras' },
  { to: '/fabricacion',    icon: Factory,          label: 'Fabricación' },
  { to: '/notificaciones', icon: Bell,             label: 'Notificaciones' },
]

export default function App() {
  return (
    <HashRouter>
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <aside className="w-52 bg-gray-900 border-r border-gray-800 flex flex-col shrink-0">
          {/* Logo */}
          <div className="px-5 py-4 border-b border-gray-800">
            <div className="text-primary-500 font-bold text-lg tracking-wide">FIJARAP</div>
            <div className="text-gray-500 text-xs mt-0.5">Sistema de Gestión</div>
          </div>
          {/* Nav */}
          <nav className="flex-1 py-3 overflow-y-auto">
            {nav.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                    isActive
                      ? 'bg-primary-600/20 text-primary-400 border-r-2 border-primary-500'
                      : 'text-gray-400 hover:text-gray-100 hover:bg-gray-800'
                  }`
                }
              >
                <Icon size={16} />
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="px-4 py-3 border-t border-gray-800">
            <p className="text-gray-600 text-xs">v1.0.0</p>
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 overflow-auto bg-gray-950">
          <Routes>
            <Route path="/"                element={<Dashboard />} />
            <Route path="/productos"       element={<Productos />} />
            <Route path="/materias-primas" element={<MateriasPrimas />} />
            <Route path="/proveedores"     element={<Proveedores />} />
            <Route path="/clientes"        element={<Clientes />} />
            <Route path="/presupuestos"    element={<Presupuestos />} />
            <Route path="/facturas"        element={<Facturas />} />
            <Route path="/compras"         element={<OrdenesCompra />} />
            <Route path="/fabricacion"     element={<Fabricacion />} />
            <Route path="/notificaciones"  element={<Notificaciones />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  )
}
