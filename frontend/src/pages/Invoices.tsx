import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, X, Receipt, Download, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import api from '../lib/api'

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  borrador:     { label: 'Borrador',     color: 'bg-gray-100 text-gray-600' },
  emitida:      { label: 'Emitida',      color: 'bg-yellow-100 text-yellow-700' },
  pagada:       { label: 'Pagada',       color: 'bg-green-100 text-green-700' },
  vencida:      { label: 'Vencida',      color: 'bg-red-100 text-red-700' },
  anulada:      { label: 'Anulada',      color: 'bg-gray-100 text-gray-400' },
}

const PAYMENT_METHODS = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'tarjeta', label: 'Tarjeta' },
  { value: 'otro', label: 'Otro' },
]

interface InvoiceItem {
  id?: number; description: string; quantity: number; unit_price: number
}
interface Invoice {
  id: number; invoice_number: string; status: string
  client: { id: number; name: string; company?: string }
  work_order?: { id: number; ot_number: string }
  items: InvoiceItem[]
  total: number
  issue_date: string; due_date?: string; payment_date?: string
  payment_method?: string; notes?: string
  client_id: number; work_order_id?: number
}

function fmt(n: number) {
  return n.toLocaleString('es', { minimumFractionDigits: 2 })
}

/* ── Mark-as-paid modal ─────────────────────────────────── */
function PayModal({ invoice, onSave, onCancel }: {
  invoice: Invoice; onSave: (d: any) => void; onCancel: () => void
}) {
  const today = new Date().toISOString().slice(0, 10)
  const [payDate, setPayDate] = useState(today)
  const [method, setMethod] = useState('transferencia')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900">Registrar pago</h2>
          <button onClick={onCancel}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <p className="text-sm text-gray-500 mb-4">Factura <span className="font-mono font-semibold">{invoice.invoice_number}</span> — ${fmt(invoice.total)}</p>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Fecha de pago</label>
            <input type="date" value={payDate} onChange={e => setPayDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Método de pago</label>
            <select value={method} onChange={e => setMethod(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none">
              {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onCancel} className="flex-1 py-2 border border-gray-200 text-sm rounded-lg text-gray-600 hover:bg-gray-50">Cancelar</button>
          <button onClick={() => onSave({ status: 'pagada', payment_date: payDate, payment_method: method })}
            className="flex-1 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700">Confirmar pago</button>
        </div>
      </div>
    </div>
  )
}

/* ── Invoice form modal ─────────────────────────────────── */
function InvoiceForm({ initial, onSave, onCancel }: {
  initial?: Partial<Invoice>; onSave: (d: any) => void; onCancel: () => void
}) {
  const [clientId, setClientId] = useState<string>(initial?.client_id?.toString() ?? '')
  const [workOrderId, setWorkOrderId] = useState<string>(initial?.work_order_id?.toString() ?? '')
  const [quoteId, setQuoteId] = useState<string>('')
  const [dueDate, setDueDate] = useState(initial?.due_date?.slice(0, 10) ?? '')
  const [paymentMethod, setPaymentMethod] = useState(initial?.payment_method ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [items, setItems] = useState<InvoiceItem[]>(
    initial?.items?.length ? initial.items : [{ description: '', quantity: 1, unit_price: 0 }]
  )

  const { data: clients = [] } = useQuery<any[]>({
    queryKey: ['clients-list'],
    queryFn: () => api.get('/clients').then(r => r.data),
  })
  const { data: workOrders = [] } = useQuery<any[]>({
    queryKey: ['ots-list'],
    queryFn: () => api.get('/work-orders', { params: { limit: 200 } }).then(r => r.data),
  })
  const { data: quotes = [] } = useQuery<any[]>({
    queryKey: ['quotes-list'],
    queryFn: () => api.get('/quotes').then(r => r.data),
    enabled: !!workOrderId,
  })

  function addItem() { setItems(p => [...p, { description: '', quantity: 1, unit_price: 0 }]) }
  function removeItem(i: number) { setItems(p => p.filter((_, j) => j !== i)) }
  function setItem(i: number, k: string, v: any) {
    setItems(p => p.map((x, j) => j === i ? { ...x, [k]: v } : x))
  }

  function handleQuoteChange(qid: string) {
    setQuoteId(qid)
    if (!qid) return
    const q = (quotes as any[]).find(q => q.id === Number(qid))
    if (!q) return
    if (q.work_order_id) setWorkOrderId(String(q.work_order_id))
    setItems(q.items.map((it: any) => ({
      description: it.description, quantity: it.quantity, unit_price: it.unit_price,
    })))
  }

  const total = items.reduce((s, it) => s + it.quantity * it.unit_price, 0)
  const valid = clientId && items.every(it => it.description.trim() && it.quantity > 0 && it.unit_price >= 0)

  function handleSave() {
    onSave({
      client_id: Number(clientId),
      work_order_id: workOrderId ? Number(workOrderId) : undefined,
      quote_id: quoteId ? Number(quoteId) : undefined,
      due_date: dueDate || undefined,
      payment_method: paymentMethod || undefined,
      notes: notes || undefined,
      items: items.map(it => ({ ...it, quantity: Number(it.quantity), unit_price: Number(it.unit_price) })),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-gray-900">{initial?.id ? 'Editar factura' : 'Nueva factura'}</h2>
          <button onClick={onCancel}><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Cliente *</label>
            <select value={clientId} onChange={e => setClientId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Seleccionar cliente...</option>
              {(clients as any[]).map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}{c.company ? ` — ${c.company}` : ''}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">OT vinculada</label>
            <select value={workOrderId} onChange={e => setWorkOrderId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none">
              <option value="">Sin OT</option>
              {(workOrders as any[]).map((o: any) => (
                <option key={o.id} value={o.id}>{o.ot_number}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Importar desde presupuesto</label>
            <select value={quoteId} onChange={e => handleQuoteChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none"
              disabled={!workOrderId}>
              <option value="">— Seleccionar —</option>
              {(quotes as any[])
                .filter((q: any) => !workOrderId || q.work_order_id === Number(workOrderId))
                .map((q: any) => (
                  <option key={q.id} value={q.id}>{q.quote_number} — {q.title}</option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Vencimiento</label>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Método de pago</label>
            <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none">
              <option value="">Sin definir</option>
              {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>

          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Notas</label>
            <input value={notes} onChange={e => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none" />
          </div>
        </div>

        {/* Items */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-gray-600">Ítems *</label>
            <button onClick={addItem} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              <Plus className="w-3 h-3" /> Agregar ítem
            </button>
          </div>
          <div className="space-y-2">
            {items.map((it, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-6">
                  <input placeholder="Descripción" value={it.description}
                    onChange={e => setItem(i, 'description', e.target.value)}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none" />
                </div>
                <div className="col-span-2">
                  <input type="number" placeholder="Cant." value={it.quantity} min={1}
                    onChange={e => setItem(i, 'quantity', e.target.value)}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none text-right" />
                </div>
                <div className="col-span-3">
                  <input type="number" placeholder="P. Unit." value={it.unit_price} min={0} step="0.01"
                    onChange={e => setItem(i, 'unit_price', e.target.value)}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none text-right" />
                </div>
                <div className="col-span-1 flex justify-end">
                  <button onClick={() => removeItem(i)} disabled={items.length === 1}
                    className="text-gray-300 hover:text-red-400 disabled:opacity-30">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end mt-2">
            <span className="text-sm font-bold text-gray-800">Total: ${fmt(total)}</span>
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2 border border-gray-200 text-sm rounded-lg text-gray-600 hover:bg-gray-50">Cancelar</button>
          <button onClick={handleSave} disabled={!valid}
            className="flex-1 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50">Guardar</button>
        </div>
      </div>
    </div>
  )
}

/* ── Main page ─────────────────────────────────────────── */
export default function Invoices() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Invoice | null>(null)
  const [paying, setPaying] = useState<Invoice | null>(null)
  const [filterStatus, setFilterStatus] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const { data: invoices = [], isLoading } = useQuery<Invoice[]>({
    queryKey: ['invoices', filterStatus, dateFrom, dateTo],
    queryFn: () => api.get('/invoices', { params: {
      status: filterStatus || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
    }}).then(r => r.data),
  })

  const createMut = useMutation({
    mutationFn: (d: any) => api.post('/invoices', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoices'] }); qc.invalidateQueries({ queryKey: ['finance-stats'] }); setShowForm(false) },
  })
  const updateMut = useMutation({
    mutationFn: ({ id, ...d }: any) => api.put(`/invoices/${id}`, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoices'] }); qc.invalidateQueries({ queryKey: ['finance-stats'] }); setEditing(null); setPaying(null) },
  })
  const deleteMut = useMutation({
    mutationFn: (id: number) => api.delete(`/invoices/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoices'] }); qc.invalidateQueries({ queryKey: ['finance-stats'] }) },
  })

  // KPI counts
  const emitidas = invoices.filter(i => i.status === 'emitida')
  const pagadas  = invoices.filter(i => i.status === 'pagada')
  const vencidas = invoices.filter(i => i.status === 'vencida')
  const totalEmitido  = emitidas.reduce((s, i) => s + i.total, 0)
  const totalCobrado  = pagadas.reduce((s, i)  => s + i.total, 0)
  const totalVencido  = vencidas.reduce((s, i)  => s + i.total, 0)

  function downloadPDF(id: number) {
    window.open(`/api/invoices/${id}/pdf`, '_blank')
  }

  return (
    <div className="max-w-6xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Receipt className="w-6 h-6 text-blue-500" /> Facturas
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{invoices.length} registro{invoices.length !== 1 ? 's' : ''} encontrado{invoices.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Nueva factura
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-yellow-100 text-yellow-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">${fmt(totalEmitido)}</p>
            <p className="text-xs text-gray-500">{emitidas.length} emitida{emitidas.length !== 1 ? 's' : ''} pendientes</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-green-100 text-green-600 flex items-center justify-center">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">${fmt(totalCobrado)}</p>
            <p className="text-xs text-gray-500">{pagadas.length} cobrada{pagadas.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">${fmt(totalVencido)}</p>
            <p className="text-xs text-gray-500">{vencidas.length} vencida{vencidas.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 bg-white border border-gray-200 rounded-xl p-3">
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-2 py-1.5 border border-gray-200 rounded text-sm bg-white focus:outline-none">
          <option value="">Todos los estados</option>
          {Object.entries(STATUS_CONFIG).map(([v, c]) => (
            <option key={v} value={v}>{c.label}</option>
          ))}
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
        {(filterStatus || dateFrom || dateTo) && (
          <button onClick={() => { setFilterStatus(''); setDateFrom(''); setDateTo('') }}
            className="text-xs text-blue-600 hover:underline">Limpiar</button>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['N° Factura', 'Cliente', 'OT', 'Emisión', 'Venc.', 'Total', 'Estado', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.map(inv => {
                  const sc = STATUS_CONFIG[inv.status] ?? { label: inv.status, color: 'bg-gray-100 text-gray-600' }
                  return (
                    <tr key={inv.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-blue-600 whitespace-nowrap">
                        {inv.invoice_number}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800">{inv.client.name}</p>
                        {inv.client.company && <p className="text-xs text-gray-400">{inv.client.company}</p>}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 font-mono">
                        {inv.work_order?.ot_number ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {new Date(inv.issue_date).toLocaleDateString('es')}
                      </td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap">
                        {inv.due_date
                          ? <span className={inv.status === 'vencida' ? 'text-red-600 font-medium' : 'text-gray-500'}>
                              {new Date(inv.due_date).toLocaleDateString('es')}
                            </span>
                          : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-800 whitespace-nowrap">
                        ${fmt(inv.total)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${sc.color}`}>
                          {sc.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => downloadPDF(inv.id)} title="Descargar PDF"
                            className="text-gray-400 hover:text-blue-600 transition-colors">
                            <Download className="w-4 h-4" />
                          </button>
                          {(inv.status === 'emitida' || inv.status === 'vencida') && (
                            <button onClick={() => setPaying(inv)}
                              className="text-xs text-green-600 hover:text-green-800 font-medium whitespace-nowrap">
                              Cobrar
                            </button>
                          )}
                          {inv.status === 'borrador' && (
                            <button onClick={() => updateMut.mutate({ id: inv.id, status: 'emitida' })}
                              className="text-xs text-yellow-600 hover:text-yellow-800 font-medium whitespace-nowrap">
                              Emitir
                            </button>
                          )}
                          <button onClick={() => setEditing(inv)}
                            className="text-xs text-gray-400 hover:text-gray-700">
                            Editar
                          </button>
                          {inv.status === 'borrador' && (
                            <button onClick={() => { if (confirm('¿Eliminar factura?')) deleteMut.mutate(inv.id) }}
                              className="text-xs text-red-400 hover:text-red-600">×</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {invoices.length === 0 && (
              <p className="text-center text-sm text-gray-400 py-10">No hay facturas registradas</p>
            )}
          </div>
        </div>
      )}

      {showForm && <InvoiceForm onSave={d => createMut.mutate(d)} onCancel={() => setShowForm(false)} />}
      {editing && <InvoiceForm initial={editing} onSave={d => updateMut.mutate({ id: editing.id, ...d })} onCancel={() => setEditing(null)} />}
      {paying && <PayModal invoice={paying} onSave={d => updateMut.mutate({ id: paying.id, ...d })} onCancel={() => setPaying(null)} />}
    </div>
  )
}
