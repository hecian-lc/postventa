import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ChevronLeft, QrCode, Sparkles, BookOpen,
  Clock, User, Calendar, Wrench,
} from 'lucide-react'
import api from '../lib/api'
import type { WorkOrder } from '../types'
import { StatusBadge, PriorityBadge } from '../components/StatusBadge'
import { STATUS_LABELS, ALL_STATUSES } from '../lib/constants'

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-sm text-gray-800 mt-0.5">{value}</p>
    </div>
  )
}

export default function OTDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [newStatus, setNewStatus] = useState('')
  const [statusNote, setStatusNote] = useState('')
  const [aiTab, setAiTab] = useState<'diagnosis' | 'report' | null>(null)
  const [aiResult, setAiResult] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [diagnosis, setDiagnosis] = useState('')
  const [solution, setSolution] = useState('')
  const [components, setComponents] = useState('')
  const [showKB, setShowKB] = useState(false)
  const [kbForm, setKbForm] = useState({ symptoms: '', diagnosis: '', solution: '', components_replaced: '', repair_time_hours: '', tags: '' })

  const { data: ot, isLoading } = useQuery<WorkOrder>({
    queryKey: ['work-order', id],
    queryFn: () => api.get(`/work-orders/${id}`).then(r => r.data),
  })

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.put(`/work-orders/${id}`, data).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['work-order', id] }); setNewStatus(''); setStatusNote('') },
  })

  const kbMutation = useMutation({
    mutationFn: (data: any) => api.post(`/work-orders/${id}/knowledge`, data).then(r => r.data),
    onSuccess: () => { setShowKB(false); alert('Caso agregado a la bitácora') },
  })

  async function callAI(type: 'diagnosis' | 'report') {
    setAiTab(type)
    setAiLoading(true)
    setAiResult('')
    try {
      if (type === 'diagnosis') {
        const { data } = await api.post(`/work-orders/${id}/ai/suggest-diagnosis`)
        setAiResult(data.suggestion)
      } else {
        const { data } = await api.post(`/work-orders/${id}/ai/generate-report`, null, {
          params: { diagnosis, solution, components },
        })
        setAiResult(data.report)
      }
    } catch {
      setAiResult('Error al llamar a la IA. Verifica la configuración de la API key.')
    } finally {
      setAiLoading(false)
    }
  }

  if (isLoading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
  if (!ot) return <p className="text-center text-gray-400 py-12">OT no encontrada</p>

  return (
    <div className="max-w-4xl space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button onClick={() => navigate('/ots')} className="text-gray-400 hover:text-gray-600 mt-1">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-bold font-mono text-blue-700">{ot.ot_number}</h1>
            <StatusBadge status={ot.status} />
            <PriorityBadge priority={ot.priority} />
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            Recibido: {new Date(ot.received_at).toLocaleString('es')}
            {ot.received_by && ` · por ${ot.received_by.name}`}
          </p>
        </div>
        {ot.qr_code_path && (
          <a
            href={`/api${ot.qr_code_path}`}
            download
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-200 rounded-lg px-3 py-2"
          >
            <QrCode className="w-4 h-4" />
            <img src={`/api${ot.qr_code_path}`} alt="QR" className="w-16 h-16" />
          </a>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Wrench className="w-4 h-4 text-gray-400" /> Información del Equipo
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Tipo" value={ot.equipment_type} />
              <Field label="Marca" value={ot.brand} />
              <Field label="Modelo" value={ot.model} />
              <Field label="N° Serie" value={ot.serial_number} />
              <Field label="Estado físico" value={ot.physical_condition} />
              <Field label="Accesorios" value={ot.accessories} />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-2">Problema Reportado</h2>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{ot.reported_problem}</p>
          </div>

          {ot.internal_notes && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5">
              <h2 className="font-semibold text-yellow-800 mb-2">Notas Internas</h2>
              <p className="text-sm text-yellow-700 whitespace-pre-wrap">{ot.internal_notes}</p>
            </div>
          )}

          {/* AI Section */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-500" /> Asistente IA
            </h2>
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => callAI('diagnosis')}
                className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Sparkles className="w-3 h-3" /> Sugerir diagnóstico
              </button>
              <button
                onClick={() => setAiTab('report')}
                className="flex items-center gap-2 px-3 py-2 border border-purple-300 text-purple-700 text-sm rounded-lg hover:bg-purple-50 transition-colors"
              >
                Generar informe técnico
              </button>
            </div>

            {aiTab === 'report' && !aiResult && (
              <div className="space-y-3 mb-4">
                <textarea rows={2} value={diagnosis} onChange={e => setDiagnosis(e.target.value)} placeholder="Diagnóstico realizado..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-purple-400 resize-none" />
                <textarea rows={2} value={solution} onChange={e => setSolution(e.target.value)} placeholder="Trabajos realizados..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-purple-400 resize-none" />
                <input value={components} onChange={e => setComponents(e.target.value)} placeholder="Componentes reemplazados..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-purple-400" />
                <button onClick={() => callAI('report')} className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700">Generar</button>
              </div>
            )}

            {aiLoading && (
              <div className="flex items-center gap-2 text-sm text-purple-600">
                <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                Generando con IA...
              </div>
            )}
            {aiResult && (
              <div className="bg-purple-50 rounded-lg p-4">
                <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans">{aiResult}</pre>
                <button onClick={() => { setAiResult(''); setAiTab(null) }} className="mt-3 text-xs text-purple-600 hover:underline">Limpiar</button>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Client */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">Cliente</h3>
            <Link to={`/clientes/${ot.client.id}`} className="font-semibold text-blue-700 hover:underline">{ot.client.name}</Link>
            {ot.client.company && <p className="text-sm text-gray-500 mt-0.5">{ot.client.company}</p>}
          </div>

          {/* Assignment */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">Asignación</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-700">{ot.assigned_to?.name ?? 'Sin asignar'}</span>
              </div>
              {ot.estimated_delivery && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-700">{new Date(ot.estimated_delivery).toLocaleDateString('es')}</span>
                </div>
              )}
            </div>
          </div>

          {/* Change status */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">Cambiar Estado</h3>
            <select
              value={newStatus}
              onChange={e => setNewStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm mb-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccionar nuevo estado...</option>
              {ALL_STATUSES.filter(s => s !== ot.status).map(s => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
            <textarea
              rows={2}
              value={statusNote}
              onChange={e => setStatusNote(e.target.value)}
              placeholder="Nota (opcional)..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none mb-2 focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
            <button
              onClick={() => updateMutation.mutate({ status: newStatus, notes: statusNote })}
              disabled={!newStatus || updateMutation.isPending}
              className="w-full py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {updateMutation.isPending ? 'Guardando...' : 'Actualizar estado'}
            </button>
          </div>

          {/* Bitácora */}
          <button
            onClick={() => setShowKB(v => !v)}
            className="w-full flex items-center gap-2 justify-center py-2.5 border border-green-300 text-green-700 text-sm rounded-xl hover:bg-green-50 transition-colors"
          >
            <BookOpen className="w-4 h-4" /> Agregar a bitácora
          </button>
          {showKB && (
            <div className="bg-white rounded-xl border border-green-200 p-4 space-y-3">
              {[
                { key: 'symptoms', label: 'Síntomas', rows: 2 },
                { key: 'diagnosis', label: 'Diagnóstico', rows: 2 },
                { key: 'solution', label: 'Solución', rows: 2 },
                { key: 'components_replaced', label: 'Componentes reemplazados', rows: 1 },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs font-medium text-gray-600 mb-0.5 block">{f.label}</label>
                  <textarea
                    rows={f.rows}
                    value={kbForm[f.key as keyof typeof kbForm]}
                    onChange={e => setKbForm(p => ({ ...p, [f.key]: e.target.value }))}
                    className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm resize-none focus:outline-none focus:ring-1 focus:ring-green-400"
                  />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-0.5 block">Horas reparación</label>
                  <input type="number" value={kbForm.repair_time_hours} onChange={e => setKbForm(p => ({ ...p, repair_time_hours: e.target.value }))} className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-0.5 block">Tags</label>
                  <input value={kbForm.tags} onChange={e => setKbForm(p => ({ ...p, tags: e.target.value }))} placeholder="plc,siemens,cpu" className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none" />
                </div>
              </div>
              <button
                onClick={() => kbMutation.mutate({
                  ...kbForm,
                  equipment_type: ot.equipment_type,
                  brand: ot.brand,
                  model: ot.model,
                  repair_time_hours: kbForm.repair_time_hours ? Number(kbForm.repair_time_hours) : undefined,
                })}
                disabled={kbMutation.isPending}
                className="w-full py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                Guardar en bitácora
              </button>
            </div>
          )}
        </div>
      </div>

      {/* History */}
      {ot.history.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400" /> Historial de cambios
          </h2>
          <div className="space-y-3">
            {[...ot.history].reverse().map(h => (
              <div key={h.id} className="flex items-start gap-4 text-sm">
                <div className="w-32 shrink-0 text-xs text-gray-400">{new Date(h.changed_at).toLocaleString('es')}</div>
                <div className="flex-1">
                  {h.old_status ? (
                    <span className="text-gray-600">
                      <StatusBadge status={h.old_status as any} />
                      <span className="mx-2 text-gray-300">→</span>
                      <StatusBadge status={h.new_status as any} />
                    </span>
                  ) : (
                    <StatusBadge status={h.new_status as any} />
                  )}
                  {h.notes && <p className="text-gray-500 text-xs mt-1">{h.notes}</p>}
                </div>
                <div className="text-xs text-gray-400">{h.changed_by.name}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
