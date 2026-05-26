import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import {
  LayoutDashboard, ClipboardList, Users, BookOpen,
  QrCode, LogOut, Menu, X, Wrench, Package, FileText,
  Calendar, BarChart2, TrendingDown, Receipt, ChevronRight,
} from 'lucide-react'

const NAV_SECTIONS = [
  {
    label: 'Operaciones',
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
      { to: '/ots', icon: ClipboardList, label: 'Órdenes de Trabajo' },
      { to: '/clientes', icon: Users, label: 'Clientes' },
      { to: '/presupuestos', icon: FileText, label: 'Presupuestos' },
      { to: '/repuestos', icon: Package, label: 'Repuestos' },
      { to: '/tareas', icon: Calendar, label: 'Tareas' },
    ],
  },
  {
    label: 'Finanzas',
    items: [
      { to: '/finanzas', icon: BarChart2, label: 'Resumen' },
      { to: '/gastos', icon: TrendingDown, label: 'Gastos' },
      { to: '/facturas', icon: Receipt, label: 'Facturas' },
    ],
  },
  {
    label: 'Herramientas',
    items: [
      { to: '/bitacora', icon: BookOpen, label: 'Bitácora' },
      { to: '/scanner', icon: QrCode, label: 'Escanear QR' },
    ],
  },
]

export default function Layout() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  return (
    <div className="flex h-screen" style={{ background: 'var(--color-bg)' }}>
      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-60 flex flex-col
        transform transition-transform duration-200
        ${open ? 'translate-x-0' : '-translate-x-full'}
        lg:relative lg:translate-x-0
      `} style={{ background: 'var(--color-sidebar)' }}>

        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10">
          <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center shrink-0">
            <Wrench className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm text-white leading-none">Post Venta</p>
            <p className="text-xs text-slate-400 mt-0.5">Sistema de Gestión</p>
          </div>
          <button onClick={() => setOpen(false)} className="ml-auto lg:hidden text-slate-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
          {NAV_SECTIONS.map(section => (
            <div key={section.label}>
              <p className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500 select-none">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {section.items.map(({ to, icon: Icon, label, exact }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={exact}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      `group flex items-center gap-3 px-3 py-2 rounded-lg text-sm cursor-pointer ${
                        isActive
                          ? 'bg-orange-500 text-white font-medium'
                          : 'text-slate-400 hover:bg-white/5 hover:text-white'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`} />
                        <span className="truncate">{label}</span>
                        {isActive && <ChevronRight className="w-3 h-3 ml-auto opacity-70" />}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* User */}
        <div className="px-3 py-3 border-t border-white/10">
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/5 transition-colors">
            <div className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
              {user.name?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white truncate leading-none">{user.name ?? 'Usuario'}</p>
              <p className="text-xs text-slate-400 capitalize mt-0.5">{user.role ?? ''}</p>
            </div>
            <button onClick={logout} title="Cerrar sesión"
              className="text-slate-500 hover:text-orange-400 cursor-pointer transition-colors shrink-0">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay mobile */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 lg:hidden shadow-sm">
          <button onClick={() => setOpen(true)} className="cursor-pointer text-slate-600 hover:text-slate-900">
            <Menu className="w-5 h-5" />
          </button>
          <div className="w-6 h-6 rounded bg-orange-500 flex items-center justify-center">
            <Wrench className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-semibold text-slate-800 text-sm">Post Venta</span>
        </header>
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
