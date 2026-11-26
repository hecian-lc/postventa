import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import {
  LayoutDashboard, ClipboardList, Users, BookOpen,
  QrCode, LogOut, Menu, X, Wrench, Package, FileText,
  Calendar, BarChart2, TrendingDown, Receipt,
} from 'lucide-react'

const NAV_SECTIONS = [
  {
    label: 'Operaciones',
    items: [
      { to: '/',            icon: LayoutDashboard, label: 'Dashboard',          exact: true },
      { to: '/ots',         icon: ClipboardList,   label: 'Órdenes de Trabajo' },
      { to: '/clientes',    icon: Users,            label: 'Clientes' },
      { to: '/presupuestos',icon: FileText,         label: 'Presupuestos' },
      { to: '/repuestos',   icon: Package,          label: 'Repuestos' },
      { to: '/tareas',      icon: Calendar,         label: 'Tareas' },
    ],
  },
  {
    label: 'Finanzas',
    items: [
      { to: '/finanzas', icon: BarChart2,   label: 'Resumen' },
      { to: '/gastos',   icon: TrendingDown, label: 'Gastos' },
      { to: '/facturas', icon: Receipt,      label: 'Facturas' },
    ],
  },
  {
    label: 'Herramientas',
    items: [
      { to: '/bitacora', icon: BookOpen, label: 'Bitácora' },
      { to: '/scanner',  icon: QrCode,   label: 'Escanear QR' },
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

      {/* ── Sidebar ── */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-56 flex flex-col select-none
        transform transition-transform duration-200 ease-out
        ${open ? 'translate-x-0' : '-translate-x-full'}
        lg:relative lg:translate-x-0
      `} style={{ background: 'var(--color-sidebar)' }}>

        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 pt-5 pb-4">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'var(--color-accent)' }}>
            <Wrench className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white leading-none tracking-tight">Post Venta</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Sistema de Gestión</p>
          </div>
          <button onClick={() => setOpen(false)}
            className="ml-auto lg:hidden text-slate-500 hover:text-white cursor-pointer p-1 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Divider */}
        <div className="mx-4 h-px bg-white/[0.06] mb-3" />

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 space-y-4 pb-2">
          {NAV_SECTIONS.map(section => (
            <div key={section.label}>
              <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: '#475569' }}>
                {section.label}
              </p>
              <div className="space-y-px">
                {section.items.map(({ to, icon: Icon, label, exact }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={exact}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      `group flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium cursor-pointer transition-all duration-150 ${
                        isActive
                          ? 'text-white'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]'
                      }`
                    }
                    style={({ isActive }) => isActive ? {
                      background: 'linear-gradient(135deg, #F97316 0%, #FB923C 100%)',
                      boxShadow: '0 2px 8px rgba(249,115,22,0.35)',
                    } : {}}
                  >
                    {({ isActive }) => (
                      <>
                        <Icon className="w-4 h-4 shrink-0" strokeWidth={isActive ? 2.5 : 1.75} />
                        <span className="truncate">{label}</span>
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Divider */}
        <div className="mx-4 h-px bg-white/[0.06]" />

        {/* User */}
        <div className="p-3">
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-white/[0.05] transition-colors group">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
              style={{ background: 'linear-gradient(135deg, #F97316, #FB923C)' }}>
              {user.name?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold text-slate-200 truncate leading-none">{user.name ?? 'Usuario'}</p>
              <p className="text-[10px] text-slate-500 capitalize mt-0.5">{user.role ?? ''}</p>
            </div>
            <button onClick={logout} title="Cerrar sesión"
              className="text-slate-600 hover:text-orange-400 cursor-pointer transition-colors p-1 rounded opacity-0 group-hover:opacity-100">
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay mobile */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)} />
      )}

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile topbar */}
        <header className="bg-white border-b px-4 py-3 flex items-center gap-3 lg:hidden"
          style={{ borderColor: 'var(--color-border)' }}>
          <button onClick={() => setOpen(true)}
            className="cursor-pointer text-slate-500 hover:text-slate-800 p-1 rounded-lg hover:bg-slate-100">
            <Menu className="w-5 h-5" />
          </button>
          <div className="w-6 h-6 rounded-md flex items-center justify-center"
            style={{ background: 'var(--color-accent)' }}>
            <Wrench className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-semibold text-slate-800 text-sm tracking-tight">Post Venta</span>
        </header>

        <main className="flex-1 overflow-auto p-5 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
