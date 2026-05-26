import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { Wrench, LogIn } from 'lucide-react'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', { email, password })
      localStorage.setItem('token', data.access_token)
      const me = await api.get('/auth/me')
      localStorage.setItem('user', JSON.stringify(me.data))
      navigate('/')
    } catch {
      setError('Email o contraseña incorrectos')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--color-sidebar)' }}>
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-80 p-10 border-r border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-orange-500 flex items-center justify-center">
            <Wrench className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-white text-sm">Post Venta</p>
            <p className="text-xs text-slate-500">Sistema de Gestión</p>
          </div>
        </div>
        <div>
          <p className="text-2xl font-bold text-white leading-snug">
            Gestión integral de<br />reparaciones y OTs
          </p>
          <p className="text-sm text-slate-400 mt-3 leading-relaxed">
            Control de órdenes de trabajo, presupuestos, inventario, finanzas y bitácora técnica en un solo lugar.
          </p>
        </div>
        <p className="text-xs text-slate-600">© 2025 Post Venta — Electrónica Industrial</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-lg bg-orange-500 flex items-center justify-center">
              <Wrench className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-bold text-slate-800">Post Venta</p>
              <p className="text-xs text-slate-500">Sistema de Gestión</p>
            </div>
          </div>

          <h2 className="text-xl font-bold text-slate-800 mb-1">Iniciar sesión</h2>
          <p className="text-sm text-slate-400 mb-6">Ingresá tus credenciales para continuar</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-shadow"
                style={{ '--tw-ring-color': 'var(--color-accent)' } as React.CSSProperties}
                placeholder="usuario@empresa.com"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-shadow"
                style={{ '--tw-ring-color': 'var(--color-accent)' } as React.CSSProperties}
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold text-white cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-50 mt-2"
              style={{ background: 'var(--color-accent)' }}
            >
              {loading
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Ingresando...</>
                : <><LogIn className="w-4 h-4" /> Ingresar</>
              }
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
