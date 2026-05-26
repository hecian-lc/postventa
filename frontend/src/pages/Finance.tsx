import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, Tooltip as PieTooltip,
} from 'recharts'
import { TrendingUp, TrendingDown, DollarSign, AlertCircle, Clock } from 'lucide-react'
import { Link } from 'react-router-dom'
import api from '../lib/api'

const CATEGORY_LABELS: Record<string, string> = {
  repuestos: 'Repuestos', herramientas: 'Herramientas',
  servicios_externos: 'Servicios ext.', mano_obra: 'Mano de obra',
  insumos: 'Insumos', otros: 'Otros',
}
const PIE_COLORS = ['#2563eb', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#6b7280']

function KPI({ title, value, sub, color, icon: Icon }: {
  title: string; value: string; sub?: string; color: string
  icon: React.ElementType
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1">
        <p className="text-xl font-bold text-gray-900">{value}</p>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

const fmt = (n: number) =>
  n.toLocaleString('es', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

export default function Finance() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['finance-stats'],
    queryFn: () => api.get('/finances/stats').then(r => r.data),
    refetchInterval: 120_000,
  })

  const { data: pendingInvoices = [] } = useQuery({
    queryKey: ['invoices-pending'],
    queryFn: () => api.get('/invoices', { params: { status: 'emitida' } }).then(r => r.data),
  })

  const { data: overdueInvoices = [] } = useQuery({
    queryKey: ['invoices-overdue'],
    queryFn: () => api.get('/invoices', { params: { status: 'vencida' } }).then(r => r.data),
  })

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const pieData = (stats?.by_category ?? []).map((c: any) => ({
    name: CATEGORY_LABELS[c.category] ?? c.category,
    value: c.total,
  }))

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Finanzas</h1>
        <p className="text-sm text-gray-500 mt-0.5">Resumen financiero del departamento — mes actual</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI title="Facturado este mes" value={`$${fmt(stats?.invoiced_month ?? 0)}`}
          color="bg-blue-100 text-blue-600" icon={DollarSign} />
        <KPI title="Cobrado este mes" value={`$${fmt(stats?.collected_month ?? 0)}`}
          sub={`Pendiente: $${fmt(stats?.pending_collection ?? 0)}`}
          color="bg-green-100 text-green-600" icon={TrendingUp} />
        <KPI title="Gastos este mes" value={`$${fmt(stats?.expenses_month ?? 0)}`}
          color="bg-red-100 text-red-600" icon={TrendingDown} />
        <KPI
          title="Balance del mes"
          value={`$${fmt(Math.abs(stats?.balance_month ?? 0))}`}
          sub={(stats?.balance_month ?? 0) >= 0 ? 'Positivo' : 'Negativo'}
          color={(stats?.balance_month ?? 0) >= 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'}
          icon={DollarSign}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Ingresos vs Gastos */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Ingresos vs Gastos — últimos 6 meses</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats?.monthly_trend ?? []}>
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={v => `$${fmt(v)}`} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: any) => `$${fmt(v)}`} />
              <Legend />
              <Bar dataKey="ingresos" name="Ingresos" fill="#2563eb" radius={[3, 3, 0, 0]} />
              <Bar dataKey="gastos" name="Gastos" fill="#ef4444" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Gastos por categoría */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Gastos por categoría (mes)</h2>
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70}
                    dataKey="value" nameKey="name">
                    {pieData.map((_: any, i: number) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <PieTooltip formatter={(v: any) => `$${fmt(v)}`} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {pieData.map((item: any, i: number) => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-gray-600">{item.name}</span>
                    </div>
                    <span className="font-semibold text-gray-700">${fmt(item.value)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">Sin gastos registrados este mes</p>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Top clientes */}
        {(stats?.top_clients ?? []).length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Top clientes por facturación</h2>
            <div className="space-y-2">
              {stats.top_clients.map((c: any, i: number) => (
                <div key={c.name} className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                  <span className="flex-1 text-sm text-gray-700 truncate">{c.name}</span>
                  <span className="text-sm font-semibold text-gray-800">${fmt(c.total)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Facturas pendientes */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Clock className="w-4 h-4 text-yellow-500" /> Pendientes de cobro
            </h2>
            <Link to="/facturas" className="text-xs text-blue-600 hover:underline">Ver todas</Link>
          </div>
          {overdueInvoices.length > 0 && (
            <div className="mb-3 bg-red-50 border border-red-100 rounded-lg p-3">
              <p className="text-xs font-semibold text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {overdueInvoices.length} factura{overdueInvoices.length > 1 ? 's' : ''} vencida{overdueInvoices.length > 1 ? 's' : ''}
              </p>
            </div>
          )}
          <div className="space-y-2">
            {[...overdueInvoices.slice(0, 3), ...pendingInvoices.slice(0, 4)].slice(0, 6).map((inv: any) => (
              <Link key={inv.id} to="/facturas"
                className="flex items-center justify-between text-sm hover:bg-gray-50 rounded px-1 py-0.5 transition-colors">
                <div>
                  <span className={`font-mono text-xs font-semibold ${inv.status === 'vencida' ? 'text-red-600' : 'text-blue-600'}`}>
                    {inv.invoice_number}
                  </span>
                  <span className="text-gray-600 ml-2">{inv.client?.name}</span>
                </div>
                <span className="font-semibold text-gray-700">${fmt(inv.total)}</span>
              </Link>
            ))}
            {pendingInvoices.length === 0 && overdueInvoices.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">Sin facturas pendientes 🎉</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
