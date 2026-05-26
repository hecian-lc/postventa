import type { OTStatus, Priority } from '../types'
import { STATUS_LABELS, PRIORITY_LABELS } from '../lib/constants'

const STATUS_STYLES: Record<string, string> = {
  recibido:               'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
  verificando:            'bg-violet-100 text-violet-700 ring-1 ring-violet-200',
  pendiente_verificacion: 'bg-amber-100 text-amber-700 ring-1 ring-amber-200',
  pendiente_aprobacion:   'bg-orange-100 text-orange-700 ring-1 ring-orange-200',
  esperando_repuestos:    'bg-red-100 text-red-600 ring-1 ring-red-200',
  en_reparacion:          'bg-blue-100 text-blue-700 ring-1 ring-blue-200',
  reparado:               'bg-teal-100 text-teal-700 ring-1 ring-teal-200',
  control_calidad:        'bg-cyan-100 text-cyan-700 ring-1 ring-cyan-200',
  listo_entrega:          'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200',
  entregado:              'bg-green-100 text-green-700 ring-1 ring-green-200',
  irreparable:            'bg-gray-100 text-gray-500 ring-1 ring-gray-200',
}

const STATUS_DOTS: Record<string, string> = {
  recibido:               'bg-slate-400',
  verificando:            'bg-violet-500',
  pendiente_verificacion: 'bg-amber-500',
  pendiente_aprobacion:   'bg-orange-500',
  esperando_repuestos:    'bg-red-500',
  en_reparacion:          'bg-blue-500',
  reparado:               'bg-teal-500',
  control_calidad:        'bg-cyan-500',
  listo_entrega:          'bg-emerald-500',
  entregado:              'bg-green-500',
  irreparable:            'bg-gray-400',
}

const PRIORITY_STYLES: Record<string, { cls: string; icon: string }> = {
  baja:    { cls: 'text-slate-500',  icon: '↓' },
  normal:  { cls: 'text-blue-600',   icon: '→' },
  alta:    { cls: 'text-orange-500', icon: '↑' },
  urgente: { cls: 'text-red-600',    icon: '!' },
}

export function StatusBadge({ status }: { status: OTStatus }) {
  const style = STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-500'
  const dot   = STATUS_DOTS[status]  ?? 'bg-gray-400'
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${style}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot} shrink-0`} />
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const { cls, icon } = PRIORITY_STYLES[priority] ?? { cls: 'text-gray-500', icon: '·' }
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${cls}`}>
      <span>{icon}</span>
      {PRIORITY_LABELS[priority]}
    </span>
  )
}
