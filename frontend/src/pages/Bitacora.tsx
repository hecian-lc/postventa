import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, BookOpen, Tag, Clock, Zap, Wrench, CheckCircle } from 'lucide-react'
import api from '../lib/api'
import type { KnowledgeEntry } from '../types'

export default function Bitacora() {
  const [search, setSearch] = useState('')
  const [equipmentFilter, setEquipmentFilter] = useState('')

  const { data: entries = [], isLoading } = useQuery<KnowledgeEntry[]>({
    queryKey: ['knowledge', search, equipmentFilter],
    queryFn: () =>
      api.get('/work-orders/knowledge/search', {
        params: { q: search || undefined, equipment_type: equipmentFilter || undefined },
      }).then(r => r.data),
    enabled: search.length === 0 || search.length >= 2,
  })

  return (
    <div className="max-w-4xl space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-emerald-600" strokeWidth={2} />
            </span>
            Bitácora de Jurisprudencia
          </h1>
          <p className="page-sub">Base de conocimiento de reparaciones anteriores</p>
        </div>
        {entries.length > 0 && (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
            {entries.length} caso{entries.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Search bar */}
      <div className="flex flex-wrap gap-2.5">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar síntoma, diagnóstico, solución, tags..."
            className="w-full pl-9 pr-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white transition-shadow"
            style={{ borderColor: 'var(--color-border)' }}
          />
        </div>
        <input
          value={equipmentFilter}
          onChange={e => setEquipmentFilter(e.target.value)}
          placeholder="Filtrar por equipo..."
          className="px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white w-44"
          style={{ borderColor: 'var(--color-border)' }}
        />
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="skeleton h-40 rounded-xl" />)}
        </div>
      ) : entries.length === 0 ? (
        /* Empty state */
        <div className="card flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
            <BookOpen className="w-8 h-8 text-slate-300" strokeWidth={1.5} />
          </div>
          <p className="font-semibold text-slate-600 text-base">Sin entradas en la bitácora</p>
          <p className="text-sm text-slate-400 mt-1 max-w-xs">
            Cuando completes una OT, podés guardar el caso como referencia técnica desde la ficha de la orden.
          </p>
          <div className="flex items-center gap-4 mt-6 text-xs text-slate-400">
            <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-amber-400" /> Síntomas</span>
            <span className="flex items-center gap-1.5"><Wrench className="w-3.5 h-3.5 text-blue-400" /> Diagnóstico</span>
            <span className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Solución</span>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map(entry => (
            <div key={entry.id} className="card p-5 hover:shadow-md transition-shadow group">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{entry.equipment_type}</p>
                  {(entry.brand || entry.model) && (
                    <p className="text-xs text-slate-400 mt-0.5 font-mono">{[entry.brand, entry.model].filter(Boolean).join(' · ')}</p>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0 text-xs text-slate-400">
                  {entry.repair_time_hours && (
                    <span className="flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
                      <Clock className="w-3 h-3" /> {entry.repair_time_hours}h
                    </span>
                  )}
                  <span>{new Date(entry.created_at).toLocaleDateString('es')}</span>
                  <span className="text-slate-500 font-medium">{entry.created_by.name}</span>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-3">
                <div className="rounded-lg p-3.5 border" style={{ background: '#FFF7ED', borderColor: '#FED7AA' }}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-orange-500 mb-1.5 flex items-center gap-1">
                    <Zap className="w-3 h-3" /> Síntoma
                  </p>
                  <p className="text-sm text-slate-700 leading-relaxed">{entry.symptoms}</p>
                </div>
                <div className="rounded-lg p-3.5 border" style={{ background: '#EFF6FF', borderColor: '#BFDBFE' }}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-blue-500 mb-1.5 flex items-center gap-1">
                    <Search className="w-3 h-3" /> Diagnóstico
                  </p>
                  <p className="text-sm text-slate-700 leading-relaxed">{entry.diagnosis}</p>
                </div>
                <div className="rounded-lg p-3.5 border" style={{ background: '#F0FDF4', borderColor: '#BBF7D0' }}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 mb-1.5 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Solución
                  </p>
                  <p className="text-sm text-slate-700 leading-relaxed">{entry.solution}</p>
                </div>
              </div>

              {entry.components_replaced && (
                <p className="text-xs text-slate-500 mt-3 flex items-center gap-1.5">
                  <Wrench className="w-3 h-3 text-slate-400" />
                  <span className="font-medium text-slate-600">Componentes:</span> {entry.components_replaced}
                </p>
              )}

              {entry.tags && (
                <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                  <Tag className="w-3 h-3 text-slate-400" />
                  {entry.tags.split(',').map(t => (
                    <span key={t} className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: '#F1F5F9', color: '#475569', border: '1px solid #E2E8F0' }}>
                      {t.trim()}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
