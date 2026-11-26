import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Check } from 'lucide-react'
import api from '../lib/api'
import type { Client, User } from '../types'
import { EQUIPMENT_TYPES } from '../lib/constants'

const STEPS = ['Cliente', 'Equipo', 'Problema', 'Recepción']

interface FormData {
  // Step 1
  client_id: number | null
  newClient: { name: string; company: string; rut: string; email: string; phone: string }
  // Step 2
  equipment_type: string
  brand: string
  model: string
  serial_number: string
  physical_condition: string
  accessories: string
  // Step 3
  reported_problem: string
  // Step 4
  priority: string
  assigned_to_id: number | null
  estimated_delivery: string
}

const INIT: FormData = {
  client_id: null,
  newClient: { name: '', company: '', rut: '', email: '', phone: '' },
  equipment_type: '',
  brand: '',
  model: '',
  serial_number: '',
  physical_condition: 'Bueno',
  accessories: '',
  reported_problem: '',
  priority: 'normal',
  assigned_to_id: null,
  estimated_delivery: '',
}

export default function NewOT() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<FormData>(INIT)
  const [clientMode, setClientMode] = useState<'search' | 'new'>('search')
  const [clientSearch, setClientSearch] = useState('')

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ['clients-search', clientSearch],
    queryFn: () => api.get('/clients', { params: { search: clientSearch } }).then(r => r.data),
  })

  const { data: technicians = [] } = useQuery<User[]>({
    queryKey: ['technicians'],
    queryFn: () => api.get('/users').then(r =>
      r.data.filter((u: User) => ['technician', 'admin', 'supervisor'].includes(u.role))
    ),
  })

  const mutation = useMutation({
    mutationFn: async () => {
      let clientId = form.client_id
      if (clientMode === 'new') {
        const { data } = await api.post('/clients', form.newClient)
        clientId = data.id
      }
      const payload = {
        client_id: clientId,
        equipment_type: form.equipment_type,
        brand: form.brand || undefined,
        model: form.model || undefined,
        serial_number: form.serial_number || undefined,
        physical_condition: form.physical_condition || undefined,
        accessories: form.accessories || undefined,
        reported_problem: form.reported_problem,
        priority: form.priority,
        assigned_to_id: form.assigned_to_id || undefined,
        estimated_delivery: form.estimated_delivery || undefined,
      }
      return api.post('/work-orders', payload).then(r => r.data)
    },
    onSuccess: (data) => navigate(`/ots/${data.id}`),
  })

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function canNext() {
    if (step === 0) return clientMode === 'new' ? form.newClient.name.trim() !== '' : form.client_id !== null
    if (step === 1) return form.equipment_type !== ''
    if (step === 2) return form.reported_problem.trim() !== ''
    return true
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/ots')} className="text-gray-400 hover:text-gray-600">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Nueva Orden de Trabajo</h1>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
              i < step ? 'bg-green-500 text-white' :
              i === step ? 'bg-blue-600 text-white' :
              'bg-gray-200 text-gray-500'
            }`}>
              {i < step ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            <span className={`text-sm hidden sm:block ${i === step ? 'font-semibold text-gray-900' : 'text-gray-400'}`}>{s}</span>
            {i < STEPS.length - 1 && <div className="w-8 h-0.5 bg-gray-200 mx-1" />}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {/* STEP 0 — Cliente */}
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-800">Datos del Cliente</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setClientMode('search')}
                className={`flex-1 py-2 text-sm rounded-lg border transition-colors ${clientMode === 'search' ? 'border-blue-600 bg-blue-50 text-blue-700 font-medium' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
              >
                Cliente existente
              </button>
              <button
                onClick={() => setClientMode('new')}
                className={`flex-1 py-2 text-sm rounded-lg border transition-colors ${clientMode === 'new' ? 'border-blue-600 bg-blue-50 text-blue-700 font-medium' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
              >
                Nuevo cliente
              </button>
            </div>

            {clientMode === 'search' ? (
              <div className="space-y-2">
                <input
                  value={clientSearch}
                  onChange={e => setClientSearch(e.target.value)}
                  placeholder="Buscar cliente por nombre o empresa..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                  {clients.map(c => (
                    <button
                      key={c.id}
                      onClick={() => set('client_id', c.id)}
                      className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50 transition-colors ${form.client_id === c.id ? 'bg-blue-50 border-l-2 border-blue-600' : ''}`}
                    >
                      <p className="font-medium text-gray-800">{c.name}</p>
                      {c.company && <p className="text-xs text-gray-400">{c.company}</p>}
                    </button>
                  ))}
                  {clients.length === 0 && (
                    <p className="text-center text-sm text-gray-400 py-4">Sin resultados</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'name', label: 'Nombre *', col: 2 },
                  { key: 'company', label: 'Empresa', col: 1 },
                  { key: 'rut', label: 'RUT', col: 1 },
                  { key: 'email', label: 'Email', col: 1 },
                  { key: 'phone', label: 'Teléfono', col: 1 },
                ].map(f => (
                  <div key={f.key} style={{ gridColumn: `span ${f.col}` }}>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                    <input
                      value={form.newClient[f.key as keyof typeof form.newClient]}
                      onChange={e => setForm(p => ({ ...p, newClient: { ...p.newClient, [f.key]: e.target.value } }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* STEP 1 — Equipo */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-800">Datos del Equipo</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de equipo *</label>
                <select
                  value={form.equipment_type}
                  onChange={e => set('equipment_type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Seleccionar...</option>
                  {EQUIPMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              {[
                { key: 'brand', label: 'Marca' },
                { key: 'model', label: 'Modelo' },
                { key: 'serial_number', label: 'N° de Serie' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                  <input
                    value={form[f.key as keyof FormData] as string}
                    onChange={e => set(f.key as keyof FormData, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Estado físico</label>
                <select
                  value={form.physical_condition}
                  onChange={e => set('physical_condition', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {['Bueno', 'Regular', 'Deteriorado', 'Con daño físico'].map(v => <option key={v}>{v}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Accesorios / Partes incluidas</label>
                <input
                  value={form.accessories}
                  onChange={e => set('accessories', e.target.value)}
                  placeholder="Cable de alimentación, módulos adicionales..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2 — Problema */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-800">Problema Reportado</h2>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Descripción del problema *</label>
              <textarea
                rows={6}
                value={form.reported_problem}
                onChange={e => set('reported_problem', e.target.value)}
                placeholder="Describa el problema reportado por el cliente con el mayor detalle posible..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          </div>
        )}

        {/* STEP 3 — Recepción */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-800">Recepción y Asignación</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Prioridad</label>
                <select
                  value={form.priority}
                  onChange={e => set('priority', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="baja">Baja</option>
                  <option value="normal">Normal</option>
                  <option value="alta">Alta</option>
                  <option value="urgente">Urgente</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Técnico asignado</label>
                <select
                  value={form.assigned_to_id ?? ''}
                  onChange={e => set('assigned_to_id', e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Sin asignar</option>
                  {technicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Fecha de entrega estimada</label>
                <input
                  type="datetime-local"
                  value={form.estimated_delivery}
                  onChange={e => set('estimated_delivery', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {mutation.isError && (
          <p className="text-sm text-red-600 mt-3">Error al crear la OT. Verifica los datos.</p>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-6 pt-4 border-t border-gray-100">
          <button
            onClick={() => step > 0 ? setStep(s => s - 1) : navigate('/ots')}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 flex items-center gap-1"
          >
            <ChevronLeft className="w-4 h-4" />
            {step === 0 ? 'Cancelar' : 'Anterior'}
          </button>
          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!canNext()}
              className="px-5 py-2 bg-blue-600 text-white text-sm rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
            >
              Siguiente <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
              className="px-5 py-2 bg-green-600 text-white text-sm rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
            >
              {mutation.isPending ? 'Creando...' : '✓ Crear OT'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
