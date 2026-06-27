import { HashRouter, Routes, Route, NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Package, Layers, Truck, Users,
  FileText, Receipt, ShoppingCart, Factory, Bell, Wallet,
  BarChart2, ClipboardList, Settings, Sun, Moon,
} from 'lucide-react'
import { ThemeProvider, useTheme } from './context/ThemeContext'
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
import Caja from './pages/Caja'
import Estadisticas from './pages/Estadisticas'
import Reportes from './pages/Reportes'
import Administracion from './pages/Administracion'
import Remitos from './pages/Remitos'
import AjustesInventario from './pages/AjustesInventario'

const nav = [
  { to: '/',               icon: LayoutDashboard, label: 'Panel' },
  { to: '/productos',      icon: Package,          label: 'Productos' },
  { to: '/materias-primas',icon: Layers,           label: 'Mat. Primas' },
  { to: '/proveedores',    icon: Truck,            label: 'Proveedores' },
  { to: '/clientes',       icon: Users,            label: 'Clientes' },
  { to: '/presupuestos',   icon: FileText,         label: 'Presupuestos' },
  { to: '/facturas',       icon: Receipt,          label: 'Facturas' },
  { to: '/caja',           icon: Wallet,           label: 'Caja' },
  { to: '/compras',        icon: ShoppingCart,     label: 'Compras' },
  { to: '/fabricacion',    icon: Factory,          label: 'Fabricación' },
  { to: '/remitos',        icon: Truck,            label: 'Remitos' },
  { to: '/ajustes',        icon: ClipboardList,    label: 'Ajustes Stock' },
  { to: '/estadisticas',   icon: BarChart2,        label: 'Estadísticas' },
  { to: '/reportes',       icon: ClipboardList,    label: 'Reportes' },
  { to: '/notificaciones', icon: Bell,             label: 'Notificaciones' },
  { to: '/administracion', icon: Settings,         label: 'Administración' },
]

function Sidebar() {
  const { theme, toggle } = useTheme()
  return (
    <aside className="sidebar w-52 flex flex-col shrink-0">
      {/* Logo */}
      <div className="sidebar-logo-border px-5 py-4">
        <div className="text-primary-500 font-bold text-lg tracking-wide">FIJARAP</div>
        <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Sistema de Gestión</div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${isActive ? 'sidebar-nav-active' : 'sidebar-nav-inactive'}`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer con toggle de tema y versión */}
      <div className="sidebar-footer px-4 py-3 flex items-center justify-between">
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>v1.0.0</span>
        <button
          onClick={toggle}
          className="btn-ghost p-1.5 rounded-lg"
          title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        >
          {theme === 'dark'
            ? <Sun size={15} className="text-yellow-400" />
            : <Moon size={15} className="text-primary-400" />
          }
        </button>
      </div>
    </aside>
  )
}

function AppInner() {
  return (
    <HashRouter>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto" style={{ backgroundColor: 'var(--bg-app)' }}>
          <Routes>
            <Route path="/"                element={<Dashboard />} />
            <Route path="/productos"       element={<Productos />} />
            <Route path="/materias-primas" element={<MateriasPrimas />} />
            <Route path="/proveedores"     element={<Proveedores />} />
            <Route path="/clientes"        element={<Clientes />} />
            <Route path="/presupuestos"    element={<Presupuestos />} />
            <Route path="/facturas"        element={<Facturas />} />
            <Route path="/caja"            element={<Caja />} />
            <Route path="/compras"         element={<OrdenesCompra />} />
            <Route path="/fabricacion"     element={<Fabricacion />} />
            <Route path="/remitos"         element={<Remitos />} />
            <Route path="/ajustes"         element={<AjustesInventario />} />
            <Route path="/estadisticas"    element={<Estadisticas />} />
            <Route path="/reportes"        element={<Reportes />} />
            <Route path="/notificaciones"  element={<Notificaciones />} />
            <Route path="/administracion"  element={<Administracion />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  )
}
