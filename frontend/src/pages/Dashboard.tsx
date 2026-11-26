import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { AlertTriangle, Clock, CheckCircle2, TrendingUp, Plus, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import api from '../lib/api'
import type { DashboardStats, WorkOrderSummary } from '../types'

// GET /dashboard/overdue: solo lo que se muestra, y la entrega estimada siempre viene (por eso está vencida)
type OTVencida = Pick<WorkOrderSummary, 'id' | 'ot_number' | 'equipment_type' | 'status'> & { estimated_delivery: string }
import { STATUS_LABELS } from '../lib/constants'

const STATUS_BAR_COLORS: Record<string, string> = {
  recibido: '#64748B',
  verificando: '#8B5CF6',
  pendiente_verificacion: '#F59E0B',
  pendiente_aprobacion: '#F97316',
  esperando_repuestos: '#EF4444',
  en_reparacion: '#3B82F6',
}

function KPICard({ title, value, sub, accent, icon: Icon }: {
  title: string; value: number | string; sub?: string
  accent: string; icon: React.ElementType
}) {
  return (
    <div className={`bg-white rounded-xl border-l-4 border border-gray-100 p-5 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow cursor-default`}
      style={{ borderLeftColor: accent }}>
      <div className="flex-1 min-w-0">
        <p className="text-2xl font-bold text-slate-800 font-mono leading-none">{value}</p>
        <p className="text-sm font-medium text-slate-600 mt-1.5">{title}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: `${accent}18`, color: accent }}>
        <Icon className="w-4.5 h-4.5" />
      </div>
    </div>
  )
}

function SkeletonCard() {
  return <div className="skeleton h-24 rounded-xl" />
}

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get('/dashboard/stats').then(r => r.data),
    refetchInterval: 60_000,
  })

  const { data: overdue = [] } = useQuery<OTVencida[]>({
    queryKey: ['overdue'],
    queryFn: () => api.get('/dashboard/overdue').then(r => r.data),
  })

  const activeStatuses = ['recibido','verificando','pendiente_verificacion','pendiente_aprobacion','esperando_repuestos','en_reparacion'] as const
  const statusItems = Object.entries(stats?.by_status ?? {})
    .filter(([s]) => activeStatuses.includes(s as typeof activeStatuses[number]))
    .map(([s, c]) => ({ name: STATUS_LABELS[s as keyof typeof STATUS_LABELS] ?? s, count: c, status: s }))
    .sort((a, b) => b.count - a.count)

  const maxCount = Math.max(...statusItems.map(i => i.count), 1)

  return (
    <div className="space-y-5 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">Resumen operacional — Post Venta</p>
        </div>
        <Link to="/ots/nueva"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white cursor-pointer hover:opacity-90 transition-opacity"
          style={{ background: 'var(--color-accent)' }}>
          <Plus className="w-4 h-4" /> Nueva OT
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {isLoading ? (
          [1,2,3,4].map(i => <SkeletonCard key={i} />)
        ) : (
          <>
            <KPICard title="OTs Activas"        value={stats?.total_active ?? 0} sub="En proceso"          accent="#3B82F6" icon={Clock} />
            <KPICard title="Vencidas"            value={stats?.overdue ?? 0}      sub="Requieren atención" accent={stats?.overdue ? '#EF4444' : '#94A3B8'} icon={AlertTriangle} />
            <KPICard title="Recibidas este mes"  value={stats?.month_received ?? 0}                        accent="#8B5CF6" icon={TrendingUp} />
            <KPICard title="Entregadas este mes" value={stats?.month_delivered ?? 0}                       accent="#10B981" icon={CheckCircle2} />
          </>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Tendencia mensual */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">OTs recibidas — últimos 6 meses</h2>
          {isLoading ? <div className="skeleton h-48 rounded-lg" /> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats?.monthly_trend ?? []} barSize={28}>
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94A3B8', fontFamily: 'Fira Sans' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94A3B8', fontFamily: 'Fira Code' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#0F172A', border: 'none', borderRadius: 8, color: '#F8FAFC', fontSize: 12, fontFamily: 'Fira Sans' }}
                  cursor={{ fill: '#F1F5F9' }}
                />
                <Bar dataKey="ots" radius={[4, 4, 0, 0]}>
                  {(stats?.monthly_trend ?? []).map((_, i) => (
                    <Cell key={i} fill={i === (stats?.monthly_trend?.length ?? 1) - 1 ? '#F97316' : '#3B82F6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Por estado */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">OTs activas por estado</h2>
          {isLoading ? <div className="skeleton h-48 rounded-lg" /> : (
            <div className="space-y-2.5">
              {statusItems.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-8">Sin OTs activas</p>
              )}
              {statusItems.map(({ name, count, status }) => {
                const color = STATUS_BAR_COLORS[status] ?? '#64748B'
                const pct = (count / maxCount) * 100
                return (
                  <div key={status} className="flex items-center gap-3">
                    <div className="w-28 text-xs text-slate-500 truncate shrink-0">{name}</div>
                    <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div className="h-2 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: color }} />
                    </div>
                    <div className="w-5 text-xs font-semibold text-slate-700 text-right font-mono shrink-0">{count}</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* OTs vencidas */}
      {overdue.length > 0 && (
        <div className="bg-white rounded-xl border border-red-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-red-600 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> OTs vencidas ({overdue.length})
            </h2>
            <Link to="/ots" className="text-xs text-slate-400 hover:text-orange-500 flex items-center gap-1 transition-colors cursor-pointer">
              Ver todas <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-1.5">
            {overdue.map(ot => (
              <Link key={ot.id} to={`/ots/${ot.id}`}
                className="flex items-center gap-4 px-3 py-2 rounded-lg border border-red-100 hover:border-red-300 hover:bg-red-50 transition-colors cursor-pointer">
                <span className="font-mono text-xs font-semibold text-red-600">{ot.ot_number}</span>
                <span className="text-sm text-slate-600 truncate">{ot.equipment_type}</span>
                <span className="ml-auto text-xs text-red-400 shrink-0 font-mono">
                  {new Date(ot.estimated_delivery).toLocaleDateString('es')}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
