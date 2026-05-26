import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus, Search, LayoutGrid, List, ChevronRight } from 'lucide-react'
import api from '../lib/api'
import type { WorkOrderSummary, OTStatus } from '../types'
import { StatusBadge, PriorityBadge } from '../components/StatusBadge'
import { STATUS_LABELS, ALL_STATUSES } from '../lib/constants'

const KANBAN_COLS: OTStatus[] = [
  'recibido', 'verificando', 'pendiente_aprobacion',
  'esperando_repuestos', 'en_reparacion', 'reparado', 'listo_entrega',
]

function OTCard({ ot }: { ot: WorkOrderSummary }) {
  const isOverdue = ot.estimated_delivery && new Date(ot.estimated_delivery) < new Date()
  return (
    <Link
      to={`/ots/${ot.id}`}
      className="block bg-white border border-gray-200 rounded-lg p-3 hover:border-blue-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <span className="font-mono text-xs font-semibold text-blue-700">{ot.ot_number}</span>
        <PriorityBadge priority={ot.priority} />
      </div>
      <p className="text-sm font-medium text-gray-800 truncate">{ot.client.name}</p>
      <p className="text-xs text-gray-500 truncate">{ot.equipment_type} {ot.brand} {ot.model}</p>
      {ot.assigned_to && (
        <p className="text-xs text-gray-400 mt-1.5">→ {ot.assigned_to.name}</p>
      )}
      {ot.estimated_delivery && (
        <p className={`text-xs mt-1 ${isOverdue ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
          {isOverdue ? '⚠ ' : ''}Entrega: {new Date(ot.estimated_delivery).toLocaleDateString('es')}
        </p>
      )}
    </Link>
  )
}

export default function OTs() {
  const [view, setView] = useState<'kanban' | 'table'>('table')
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<OTStatus | ''>('')

  const { data: ots = [], isLoading } = useQuery<WorkOrderSummary[]>({
    queryKey: ['work-orders', filterStatus, search],
    queryFn: () =>
      api.get('/work-orders', { params: { status: filterStatus || undefined, search: search || undefined } })
         .then(r => r.data),
  })

  const grouped: Record<OTStatus, WorkOrderSummary[]> = {} as any
  KANBAN_COLS.forEach(s => { grouped[s] = [] })
  ots.forEach(ot => { if (grouped[ot.status]) grouped[ot.status].push(ot) })

  return (
    <div className="space-y-4 max-w-7xl">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Órdenes de Trabajo</h1>
        <Link
          to="/ots/nueva"
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Nueva OT
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por N° OT, equipo, modelo, serie..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as OTStatus | '')}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">Todos los estados</option>
          {ALL_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
        <div className="flex rounded-lg border border-gray-300 overflow-hidden">
          <button onClick={() => setView('table')} className={`px-3 py-2 text-sm ${view === 'table' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
            <List className="w-4 h-4" />
          </button>
          <button onClick={() => setView('kanban')} className={`px-3 py-2 text-sm ${view === 'kanban' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Table View */}
      {!isLoading && view === 'table' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['N° OT', 'Cliente', 'Equipo', 'Estado', 'Prioridad', 'Técnico', 'Recibido', 'Entrega', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {ots.map(ot => {
                  const isOverdue = ot.estimated_delivery && new Date(ot.estimated_delivery) < new Date()
                  return (
                    <tr key={ot.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono font-semibold text-blue-700 text-xs">{ot.ot_number}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800">{ot.client.name}</p>
                        {ot.client.company && <p className="text-xs text-gray-400">{ot.client.company}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-gray-700">{ot.equipment_type}</p>
                        <p className="text-xs text-gray-400">{[ot.brand, ot.model].filter(Boolean).join(' ')}</p>
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={ot.status} /></td>
                      <td className="px-4 py-3"><PriorityBadge priority={ot.priority} /></td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{ot.assigned_to?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{new Date(ot.received_at).toLocaleDateString('es')}</td>
                      <td className={`px-4 py-3 text-xs ${isOverdue ? 'text-red-500 font-semibold' : 'text-gray-500'}`}>
                        {ot.estimated_delivery ? new Date(ot.estimated_delivery).toLocaleDateString('es') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Link to={`/ots/${ot.id}`} className="text-blue-600 hover:text-blue-800">
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {ots.length === 0 && (
              <p className="text-center text-sm text-gray-400 py-10">No hay órdenes de trabajo</p>
            )}
          </div>
        </div>
      )}

      {/* Kanban View */}
      {!isLoading && view === 'kanban' && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {KANBAN_COLS.map(status => (
            <div key={status} className="flex-none w-64">
              <div className="flex items-center justify-between mb-2 px-1">
                <StatusBadge status={status} />
                <span className="text-xs text-gray-400 font-semibold">{grouped[status]?.length ?? 0}</span>
              </div>
              <div className="space-y-2 min-h-24">
                {grouped[status]?.map(ot => <OTCard key={ot.id} ot={ot} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
