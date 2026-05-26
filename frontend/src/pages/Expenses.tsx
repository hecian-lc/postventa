import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, X, TrendingDown, Filter } from 'lucide-react'
import api from '../lib/api'

const CATEGORIES = [
  { value: 'repuestos', label: 'Repuestos', color: 'bg-blue-100 text-blue-700' },
  { value: 'herramientas', label: 'Herramientas', color: 'bg-orange-100 text-orange-700' },
  { value: 'servicios_externos', label: 'Servicios externos', color: 'bg-purple-100 text-purple-700' },
  { value: 'mano_obra', label: 'Mano de obra', color: 'bg-green-100 text-green-700' },
  { value: 'insumos', label: 'Insumos', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'otros', label: 'Otros', color: 'bg-gray-100 text-gray-600' },
]
const CAT_MAP = Object.fromEntries(CATEGORIES.map(c => [c.value, c]))

interface Expense {
  id: number; description: string; category: string; amount: number
  expense_date: string; supplier?: string; receipt_number?: string; notes?: string
  work_order_id?: number; work_order?: { id: number; ot_number: string }
  created_by: { id: number; name: string }; created_at: string
}

function ExpenseForm({ initial, onSave, onCancel }: {
  initial?: Partial<Expense>; onSave: (d: any) => void; onCancel: () => void
}) {
  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState({
    description: initial?.description ?? '',
    category: initial?.category ?? 'otros',
    amount: initial?.amount ?? '',
    expense_date: initial?.expense_date?.slice(0, 10) ?? today,
    supplier: initial?.supplier ?? '',
    receipt_number: initial?.receipt_number ?? '',
    notes: initial?.notes ?? '',
    work_order_id: initial?.work_order_id ?? '',
  })
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-gray-900">{initial?.id ? 'Editar gasto' : 'Registrar gasto'}</h2>
          <button onClick={onCancel}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Descripción *</label>
            <input value={form.description} onChange={e => set('description', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Categoría</label>
            <select value={form.category} onChange={e => set('category', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none">
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Monto *</label>
            <input type="number" value={form.amount} onChange={e => set('amount', e.target.value)} min={0} step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Fecha *</label>
            <input type="date" value={form.expense_date} onChange={e => set('expense_date', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Proveedor</label>
            <input value={form.supplier} onChange={e => set('supplier', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">N° Comprobante</label>
            <input value={form.receipt_number} onChange={e => set('receipt_number', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">OT vinculada (ID)</label>
            <input type="number" value={form.work_order_id} onChange={e => set('work_order_id', e.target.value)}
              placeholder="Opcional"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notas</label>
            <input value={form.notes} onChange={e => set('notes', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none" />
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onCancel} className="flex-1 py-2 border border-gray-200 text-sm rounded-lg text-gray-600 hover:bg-gray-50">Cancelar</button>
          <button onClick={() => onSave({ ...form, amount: Number(form.amount), work_order_id: form.work_order_id ? Number(form.work_order_id) : undefined })}
            disabled={!form.description.trim() || !form.amount}
            className="flex-1 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50">Guardar</button>
        </div>
      </div>
    </div>
  )
}

export default function Expenses() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [filterCat, setFilterCat] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const { data: expenses = [], isLoading } = useQuery<Expense[]>({
    queryKey: ['expenses', filterCat, dateFrom, dateTo],
    queryFn: () => api.get('/expenses', { params: {
      category: filterCat || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
    }}).then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (d: any) => api.post('/expenses', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses'] }); qc.invalidateQueries({ queryKey: ['finance-stats'] }); setShowForm(false) },
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, ...d }: any) => api.put(`/expenses/${id}`, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses'] }); qc.invalidateQueries({ queryKey: ['finance-stats'] }); setEditing(null) },
  })
  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/expenses/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses'] }); qc.invalidateQueries({ queryKey: ['finance-stats'] }) },
  })

  const total = expenses.reduce((s, e) => s + e.amount, 0)

  return (
    <div className="max-w-5xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingDown className="w-6 h-6 text-red-500" /> Control de Gastos
          </h1>
          {expenses.length > 0 && (
            <p className="text-sm text-gray-500 mt-0.5">
              Total filtrado: <span className="font-semibold text-gray-800">${total.toLocaleString('es', { minimumFractionDigits: 2 })}</span>
              {' '}({expenses.length} registros)
            </p>
          )}
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Registrar gasto
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 bg-white border border-gray-200 rounded-xl p-3">
        <Filter className="w-4 h-4 text-gray-400" />
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
          className="px-2 py-1.5 border border-gray-200 rounded text-sm bg-white focus:outline-none">
          <option value="">Todas las categorías</option>
          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">Desde</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">Hasta</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none" />
        </div>
        {(filterCat || dateFrom || dateTo) && (
          <button onClick={() => { setFilterCat(''); setDateFrom(''); setDateTo('') }}
            className="text-xs text-blue-600 hover:underline">Limpiar</button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Fecha', 'Descripción', 'Categoría', 'Monto', 'Proveedor', 'Comprobante', 'OT', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {expenses.map(e => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {new Date(e.expense_date).toLocaleDateString('es')}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{e.description}</p>
                      {e.notes && <p className="text-xs text-gray-400 truncate max-w-40">{e.notes}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${CAT_MAP[e.category]?.color ?? 'bg-gray-100 text-gray-600'}`}>
                        {CAT_MAP[e.category]?.label ?? e.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-800 whitespace-nowrap">
                      ${e.amount.toLocaleString('es', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{e.supplier ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 font-mono">{e.receipt_number ?? '—'}</td>
                    <td className="px-4 py-3 text-xs">
                      {e.work_order
                        ? <span className="text-blue-600 font-mono">{e.work_order.ot_number}</span>
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => setEditing(e)} className="text-xs text-gray-400 hover:text-gray-700">Editar</button>
                        <button onClick={() => { if (confirm('¿Eliminar?')) deleteMutation.mutate(e.id) }}
                          className="text-xs text-red-400 hover:text-red-600">×</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              {expenses.length > 0 && (
                <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                  <tr>
                    <td colSpan={3} className="px-4 py-3 text-sm font-bold text-gray-700">Total</td>
                    <td className="px-4 py-3 text-sm font-bold text-gray-900">
                      ${total.toLocaleString('es', { minimumFractionDigits: 2 })}
                    </td>
                    <td colSpan={4} />
                  </tr>
                </tfoot>
              )}
            </table>
            {expenses.length === 0 && <p className="text-center text-sm text-gray-400 py-10">No hay gastos registrados</p>}
          </div>
        </div>
      )}

      {showForm && <ExpenseForm onSave={d => createMutation.mutate(d)} onCancel={() => setShowForm(false)} />}
      {editing && <ExpenseForm initial={editing} onSave={d => updateMutation.mutate({ id: editing.id, ...d })} onCancel={() => setEditing(null)} />}
    </div>
  )
}
