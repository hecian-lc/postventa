import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus, Search, FileText, Download, ChevronRight, X, Trash2 } from 'lucide-react'
import api from '../lib/api'
import type { WorkOrderSummary } from '../types'

type QuoteStatus = 'borrador' | 'enviada' | 'aprobada' | 'rechazada'

interface QuoteItem { id?: number; description: string; quantity: number; unit_price: number; item_type: string }
interface Quote {
  id: number; quote_number: string; title: string; status: QuoteStatus
  work_order: { id: number; ot_number: string; equipment_type: string; brand?: string; model?: string; client: { name: string; company?: string } }
  created_at: string; total: number; items: QuoteItem[]
}

const STATUS_STYLE: Record<QuoteStatus, string> = {
  borrador: 'bg-gray-100 text-gray-600',
  enviada: 'bg-yellow-100 text-yellow-700',
  aprobada: 'bg-green-100 text-green-700',
  rechazada: 'bg-red-100 text-red-700',
}
const STATUS_LABEL: Record<QuoteStatus, string> = {
  borrador: 'Borrador', enviada: 'Enviada', aprobada: 'Aprobada', rechazada: 'Rechazada',
}
const ITEM_TYPES = [
  { value: 'mano_obra', label: 'Mano de obra' },
  { value: 'repuesto', label: 'Repuesto' },
  { value: 'servicio', label: 'Servicio' },
  { value: 'otro', label: 'Otro' },
]

type QuoteInput = {
  work_order_id: number | null; title: string; notes: string
  valid_until?: string; items: QuoteItem[]
}

function QuoteEditor({ initial, onSave, onCancel }: {
  initial?: Partial<Quote> & { work_order_id?: number }
  onSave: (d: QuoteInput) => void; onCancel: () => void
}) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [notes, setNotes] = useState('')
  const [validUntil, setValidUntil] = useState('')
  const [items, setItems] = useState<QuoteItem[]>(initial?.items ?? [{ description: '', quantity: 1, unit_price: 0, item_type: 'mano_obra' }])
  const [otSearch, setOtSearch] = useState('')
  const [selectedOT, setSelectedOT] = useState(initial?.work_order_id ?? initial?.work_order?.id ?? null as null | number)

  const { data: ots = [] } = useQuery<WorkOrderSummary[]>({
    queryKey: ['ots-search', otSearch],
    queryFn: () => api.get('/work-orders', { params: { search: otSearch || undefined } }).then(r => r.data),
    enabled: !selectedOT,
  })

  const addItem = () => setItems(p => [...p, { description: '', quantity: 1, unit_price: 0, item_type: 'mano_obra' }])
  const removeItem = (i: number) => setItems(p => p.filter((_, idx) => idx !== i))
  const setItem = <K extends keyof QuoteItem>(i: number, k: K, v: QuoteItem[K]) =>
    setItems(p => p.map((item, idx) => idx === i ? { ...item, [k]: v } : item))

  const total = items.reduce((s, it) => s + it.quantity * it.unit_price, 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">{initial?.id ? 'Editar presupuesto' : 'Nuevo presupuesto'}</h2>
          <button onClick={onCancel}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-4">
          {/* OT selector */}
          {!selectedOT ? (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Orden de Trabajo *</label>
              <input value={otSearch} onChange={e => setOtSearch(e.target.value)} placeholder="Buscar OT..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-1 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <div className="max-h-36 overflow-y-auto border border-gray-200 rounded-lg divide-y">
                {ots.map(ot => (
                  <button key={ot.id} onClick={() => setSelectedOT(ot.id)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50">
                    <span className="font-mono text-blue-700 mr-2">{ot.ot_number}</span>
                    <span className="text-gray-600">{ot.client.name} — {ot.equipment_type}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-blue-50 px-3 py-2 rounded-lg">
              <span className="text-sm text-blue-700 font-medium">OT seleccionada</span>
              {!initial?.id && <button onClick={() => setSelectedOT(null)} className="ml-auto text-xs text-blue-500 hover:underline">Cambiar</button>}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Título del presupuesto *</label>
              <input value={title} onChange={e => setTitle(e.target.value)}
                placeholder="Ej: Reparación CPU Siemens S7-300"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Válido hasta</label>
              <input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none" />
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-600 uppercase">Ítems</label>
              <button onClick={addItem} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                <Plus className="w-3 h-3" /> Agregar ítem
              </button>
            </div>
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-4">
                    {i === 0 && <label className="block text-xs text-gray-400 mb-0.5">Descripción</label>}
                    <input value={item.description} onChange={e => setItem(i, 'description', e.target.value)}
                      placeholder="Descripción..."
                      className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-400" />
                  </div>
                  <div className="col-span-3">
                    {i === 0 && <label className="block text-xs text-gray-400 mb-0.5">Tipo</label>}
                    <select value={item.item_type} onChange={e => setItem(i, 'item_type', e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm bg-white focus:outline-none">
                      {ITEM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    {i === 0 && <label className="block text-xs text-gray-400 mb-0.5">Cant.</label>}
                    <input type="number" value={item.quantity} onChange={e => setItem(i, 'quantity', Number(e.target.value))} min={1}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none text-center" />
                  </div>
                  <div className="col-span-2">
                    {i === 0 && <label className="block text-xs text-gray-400 mb-0.5">P. Unit.</label>}
                    <input type="number" value={item.unit_price} onChange={e => setItem(i, 'unit_price', Number(e.target.value))} min={0}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none" />
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <button onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end mt-3 pt-2 border-t border-gray-100">
              <p className="text-sm font-bold text-gray-800">Total: ${total.toLocaleString('es', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notas / Condiciones</label>
            <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Condiciones de pago, garantía, plazo de entrega..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none" />
          </div>
        </div>

        <div className="flex gap-3 p-5 border-t border-gray-100">
          <button onClick={onCancel} className="flex-1 py-2 border border-gray-200 text-sm rounded-lg text-gray-600 hover:bg-gray-50">Cancelar</button>
          <button
            onClick={() => onSave({ work_order_id: selectedOT, title, notes, valid_until: validUntil || undefined, items })}
            disabled={!selectedOT || !title.trim()}
            className="flex-1 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Quotes() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Quote | null>(null)

  const { data: quotes = [], isLoading } = useQuery<Quote[]>({
    queryKey: ['quotes', filterStatus],
    queryFn: () => api.get('/quotes', { params: { status: filterStatus || undefined } }).then(r => r.data),
  })

  const filtered = quotes.filter(q =>
    !search || q.quote_number.toLowerCase().includes(search.toLowerCase()) ||
    q.work_order.client.name.toLowerCase().includes(search.toLowerCase()) ||
    q.title.toLowerCase().includes(search.toLowerCase())
  )

  const createMutation = useMutation({
    mutationFn: (d: QuoteInput) => api.post('/quotes', d).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['quotes'] }); setShowForm(false) },
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, ...d }: QuoteInput & { id: number }) => api.put(`/quotes/${id}`, d).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['quotes'] }); setEditing(null) },
  })
  const changeStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => api.put(`/quotes/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quotes'] }),
  })

  function downloadPDF(id: number) {
    window.open(`/api/quotes/${id}/pdf`, '_blank')
  }

  return (
    <div className="max-w-5xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileText className="w-6 h-6 text-blue-600" /> Presupuestos
        </h1>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Nuevo
        </button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none">
          <option value="">Todos</option>
          {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {filtered.map(q => (
            <div key={q.id} className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-mono text-xs font-semibold text-blue-700">{q.quote_number}</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE[q.status]}`}>
                    {STATUS_LABEL[q.status]}
                  </span>
                </div>
                <p className="font-semibold text-gray-800 truncate">{q.title}</p>
                <p className="text-xs text-gray-400">
                  <Link to={`/ots/${q.work_order.id}`} className="hover:underline text-blue-600">{q.work_order.ot_number}</Link>
                  {' · '}{q.work_order.client.name}
                  {' · '}{new Date(q.created_at).toLocaleDateString('es')}
                </p>
              </div>
              <p className="font-bold text-gray-800 shrink-0">${q.total.toLocaleString('es', { minimumFractionDigits: 2 })}</p>

              {/* Quick status change */}
              <select value={q.status}
                onChange={e => changeStatus.mutate({ id: q.id, status: e.target.value })}
                className="text-xs border border-gray-200 rounded px-2 py-1 bg-white focus:outline-none">
                {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>

              <button onClick={() => downloadPDF(q.id)}
                className="text-gray-400 hover:text-blue-600" title="Descargar PDF">
                <Download className="w-4 h-4" />
              </button>
              <button onClick={() => setEditing(q)} className="text-gray-400 hover:text-gray-600">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ))}
          {filtered.length === 0 && <p className="text-center text-sm text-gray-400 py-10">No hay presupuestos</p>}
        </div>
      )}

      {showForm && <QuoteEditor onSave={d => createMutation.mutate(d)} onCancel={() => setShowForm(false)} />}
      {editing && <QuoteEditor initial={editing} onSave={d => updateMutation.mutate({ id: editing.id, ...d })} onCancel={() => setEditing(null)} />}
    </div>
  )
}
