import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, BookOpen, Tag, Clock } from 'lucide-react'
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-green-600" /> Bitácora de Jurisprudencia
        </h1>
        <p className="text-sm text-gray-500 mt-1">Base de conocimiento de reparaciones anteriores para consulta y referencia</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar síntoma, diagnóstico, solución, tags..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <input
          value={equipmentFilter}
          onChange={e => setEquipmentFilter(e.target.value)}
          placeholder="Filtrar por equipo..."
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 w-44"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="space-y-3">
          {entries.map(entry => (
            <div key={entry.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:border-green-200 transition-colors">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="font-semibold text-gray-800">{entry.equipment_type}</p>
                  <p className="text-xs text-gray-400">{[entry.brand, entry.model].filter(Boolean).join(' ')}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0 text-xs text-gray-400">
                  {entry.repair_time_hours && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {entry.repair_time_hours}h
                    </span>
                  )}
                  <span>{new Date(entry.created_at).toLocaleDateString('es')}</span>
                  <span>{entry.created_by.name}</span>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-orange-50 rounded-lg p-3">
                  <p className="text-xs font-semibold text-orange-700 uppercase mb-1">Síntoma</p>
                  <p className="text-sm text-gray-700">{entry.symptoms}</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-xs font-semibold text-blue-700 uppercase mb-1">Diagnóstico</p>
                  <p className="text-sm text-gray-700">{entry.diagnosis}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3">
                  <p className="text-xs font-semibold text-green-700 uppercase mb-1">Solución</p>
                  <p className="text-sm text-gray-700">{entry.solution}</p>
                </div>
              </div>

              {entry.components_replaced && (
                <p className="text-xs text-gray-500 mt-3">
                  <span className="font-semibold">Componentes:</span> {entry.components_replaced}
                </p>
              )}
              {entry.tags && (
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <Tag className="w-3 h-3 text-gray-400" />
                  {entry.tags.split(',').map(t => (
                    <span key={t} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{t.trim()}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
          {entries.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No hay entradas en la bitácora</p>
              <p className="text-xs mt-1">Agrega casos desde la ficha de cada OT</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
