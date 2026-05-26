import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, AlertTriangle, X, Package, ArrowUp, ArrowDown } from 'lucide-react'
import api from '../lib/api'

interface SparePart {
  id: number; code?: string; name: string; description?: string
  quantity: number; min_stock: number; unit_price?: number
  supplier?: string; location?: string; low_stock: boolean
}

function SparePartForm({ initial, onSave, onCancel }: {
  initial?: Partial<SparePart>; onSave: (d: any) => void; onCancel: () => void
}) {
  const [form, setForm] = useState({
    code: initial?.code ?? '', name: initial?.name ?? '',
    description: initial?.description ?? '', quantity: initial?.quantity ?? 0,
    min_stock: initial?.min_stock ?? 1, unit_price: initial?.unit_price ?? '',
    supplier: initial?.supplier ?? '', location: initial?.location ?? '',
  })
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-gray-900">{initial?.id ? 'Editar repuesto' : 'Nuevo repuesto'}</h2>
          <button onClick={onCancel}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { k: 'name', l: 'Nombre *', c: 2, t: 'text' },
            { k: 'code', l: 'Código', c: 1, t: 'text' },
            { k: 'location', l: 'Ubicación', c: 1, t: 'text' },
            { k: 'quantity', l: 'Stock actual', c: 1, t: 'number' },
            { k: 'min_stock', l: 'Stock mínimo', c: 1, t: 'number' },
            { k: 'unit_price', l: 'Precio unitario', c: 1, t: 'number' },
            { k: 'supplier', l: 'Proveedor', c: 1, t: 'text' },
            { k: 'description', l: 'Descripción', c: 2, t: 'text' },
          ].map(f => (
            <div key={f.k} style={{ gridColumn: `span ${f.c}` }}>
              <label className="block text-xs font-medium text-gray-600 mb-1">{f.l}</label>
              <input type={f.t} value={form[f.k as keyof typeof form]}
                onChange={e => set(f.k, f.t === 'number' ? Number(e.target.value) : e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          ))}
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onCancel} className="flex-1 py-2 border border-gray-200 text-sm rounded-lg text-gray-600 hover:bg-gray-50">Cancelar</button>
          <button onClick={() => onSave(form)} disabled={!form.name.trim()}
            className="flex-1 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50">Guardar</button>
        </div>
      </div>
    </div>
  )
}

function AdjustModal({ part, onClose }: { part: SparePart; onClose: () => void }) {
  const qc = useQueryClient()
  const [delta, setDelta] = useState(0)
  const [reason, setReason] = useState('')
  const mutation = useMutation({
    mutationFn: () => api.post(`/spare-parts/${part.id}/adjust`, { delta, reason }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['spare-parts'] }); onClose() },
  })
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900">Ajustar stock</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <p className="text-sm text-gray-600 mb-3">
          <span className="font-semibold">{part.name}</span> — Stock actual: <span className="font-bold">{part.quantity}</span>
        </p>
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => setDelta(d => d - 1)} className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50">
            <ArrowDown className="w-4 h-4" />
          </button>
          <input type="number" value={delta} onChange={e => setDelta(Number(e.target.value))}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-center font-bold text-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <button onClick={() => setDelta(d => d + 1)} className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50">
            <ArrowUp className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-gray-500 mb-3 text-center">
          Resultado: {part.quantity + delta} unidades
        </p>
        <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Motivo (opcional)"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-3 focus:outline-none" />
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 border border-gray-200 text-sm rounded-lg text-gray-600">Cancelar</button>
          <button onClick={() => mutation.mutate()} disabled={delta === 0 || mutation.isPending}
            className="flex-1 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50">
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SpareParts() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<SparePart | null>(null)
  const [adjusting, setAdjusting] = useState<SparePart | null>(null)

  const { data: parts = [], isLoading } = useQuery<SparePart[]>({
    queryKey: ['spare-parts', search, lowStockOnly],
    queryFn: () => api.get('/spare-parts', { params: { search: search || undefined, low_stock_only: lowStockOnly || undefined } }).then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (d: any) => api.post('/spare-parts', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['spare-parts'] }); setShowForm(false) },
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, ...d }: any) => api.put(`/spare-parts/${id}`, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['spare-parts'] }); setEditing(null) },
  })

  const lowStockCount = parts.filter(p => p.low_stock).length

  return (
    <div className="max-w-5xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="w-6 h-6 text-orange-500" /> Repuestos
          </h1>
          {lowStockCount > 0 && (
            <p className="text-sm text-orange-600 flex items-center gap-1 mt-0.5">
              <AlertTriangle className="w-3.5 h-3.5" /> {lowStockCount} ítems con stock bajo
            </p>
          )}
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Nuevo
        </button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre, código o proveedor..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <button onClick={() => setLowStockOnly(v => !v)}
          className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors ${lowStockOnly ? 'bg-orange-100 border-orange-300 text-orange-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
          <AlertTriangle className="w-4 h-4" /> Stock bajo
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Código', 'Nombre', 'Stock', 'Mín.', 'Precio Unit.', 'Proveedor', 'Ubicación', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {parts.map(p => (
                  <tr key={p.id} className={`hover:bg-gray-50 ${p.low_stock ? 'bg-orange-50' : ''}`}>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.code ?? '—'}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{p.name}</p>
                      {p.description && <p className="text-xs text-gray-400 truncate max-w-48">{p.description}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-bold text-base ${p.low_stock ? 'text-orange-600' : 'text-gray-800'}`}>
                        {p.quantity}
                      </span>
                      {p.low_stock && <AlertTriangle className="inline w-3.5 h-3.5 text-orange-500 ml-1" />}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{p.min_stock}</td>
                    <td className="px-4 py-3 text-gray-700">{p.unit_price ? `$${p.unit_price.toLocaleString('es')}` : '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{p.supplier ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{p.location ?? '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setAdjusting(p)} className="text-xs text-blue-600 hover:underline">Stock</button>
                        <button onClick={() => setEditing(p)} className="text-xs text-gray-500 hover:underline">Editar</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {parts.length === 0 && <p className="text-center text-sm text-gray-400 py-10">No hay repuestos</p>}
          </div>
        </div>
      )}

      {showForm && <SparePartForm onSave={d => createMutation.mutate(d)} onCancel={() => setShowForm(false)} />}
      {editing && <SparePartForm initial={editing} onSave={d => updateMutation.mutate({ id: editing.id, ...d })} onCancel={() => setEditing(null)} />}
      {adjusting && <AdjustModal part={adjusting} onClose={() => setAdjusting(null)} />}
    </div>
  )
}
