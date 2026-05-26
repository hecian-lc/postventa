import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, ChevronRight, X, Building2, Phone, Mail } from 'lucide-react'
import api from '../lib/api'
import type { Client } from '../types'

function ClientForm({ initial, onSave, onCancel }: {
  initial?: Partial<Client>; onSave: (d: any) => void; onCancel: () => void
}) {
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    company: initial?.company ?? '',
    rut: initial?.rut ?? '',
    email: initial?.email ?? '',
    phone: initial?.phone ?? '',
    address: initial?.address ?? '',
    notes: initial?.notes ?? '',
  })

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-gray-900">{initial?.id ? 'Editar Cliente' : 'Nuevo Cliente'}</h2>
          <button onClick={onCancel}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { k: 'name', l: 'Nombre *', c: 2 },
            { k: 'company', l: 'Empresa', c: 1 },
            { k: 'rut', l: 'RUT', c: 1 },
            { k: 'email', l: 'Email', c: 1 },
            { k: 'phone', l: 'Teléfono', c: 1 },
            { k: 'address', l: 'Dirección', c: 2 },
            { k: 'notes', l: 'Notas', c: 2 },
          ].map(f => (
            <div key={f.k} style={{ gridColumn: `span ${f.c}` }}>
              <label className="block text-xs font-medium text-gray-600 mb-1">{f.l}</label>
              {f.k === 'notes' ? (
                <textarea rows={3} value={form[f.k as keyof typeof form]} onChange={e => set(f.k, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              ) : (
                <input value={form[f.k as keyof typeof form]} onChange={e => set(f.k, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onCancel} className="flex-1 py-2 border border-gray-200 text-sm rounded-lg text-gray-600 hover:bg-gray-50">Cancelar</button>
          <button onClick={() => onSave(form)} disabled={!form.name.trim()}
            className="flex-1 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50">
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Clients() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Client | null>(null)

  const { data: clients = [], isLoading } = useQuery<Client[]>({
    queryKey: ['clients', search],
    queryFn: () => api.get('/clients', { params: { search: search || undefined } }).then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (d: any) => api.post('/clients', d).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clients'] }); setShowForm(false) },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, ...d }: any) => api.put(`/clients/${id}`, d).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clients'] }); setEditing(null) },
  })

  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" /> Nuevo
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre o empresa..."
          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {clients.map(c => (
            <div key={c.id} className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm shrink-0">
                {c.name[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 truncate">{c.name}</p>
                <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                  {c.company && <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{c.company}</span>}
                  {c.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone}</span>}
                  {c.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{c.email}</span>}
                </div>
              </div>
              <div className="shrink-0 text-center">
                <p className="text-lg font-bold text-gray-800">{c.total_ots}</p>
                <p className="text-xs text-gray-400">OTs</p>
              </div>
              <button onClick={() => setEditing(c)} className="text-gray-400 hover:text-gray-600">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ))}
          {clients.length === 0 && <p className="text-center text-sm text-gray-400 py-10">No hay clientes</p>}
        </div>
      )}

      {showForm && (
        <ClientForm
          onSave={d => createMutation.mutate(d)}
          onCancel={() => setShowForm(false)}
        />
      )}
      {editing && (
        <ClientForm
          initial={editing}
          onSave={d => updateMutation.mutate({ id: editing.id, ...d })}
          onCancel={() => setEditing(null)}
        />
      )}
    </div>
  )
}
