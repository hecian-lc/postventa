import type { OTStatus, Priority } from '../types'

export const STATUS_LABELS: Record<OTStatus, string> = {
  recibido: 'Recibido',
  verificando: 'Verificando',
  pendiente_verificacion: 'Pend. Verificación',
  pendiente_aprobacion: 'Pend. Aprobación',
  esperando_repuestos: 'Esp. Repuestos',
  en_reparacion: 'En Reparación',
  reparado: 'Reparado',
  listo_entrega: 'Listo Entrega',
  entregado: 'Entregado',
  devuelto: 'Devuelto',
  irreparable: 'Irreparable',
}

export const STATUS_COLORS: Record<OTStatus, string> = {
  recibido: 'bg-blue-100 text-blue-800',
  verificando: 'bg-yellow-100 text-yellow-800',
  pendiente_verificacion: 'bg-orange-100 text-orange-800',
  pendiente_aprobacion: 'bg-purple-100 text-purple-800',
  esperando_repuestos: 'bg-pink-100 text-pink-800',
  en_reparacion: 'bg-indigo-100 text-indigo-800',
  reparado: 'bg-green-100 text-green-800',
  listo_entrega: 'bg-teal-100 text-teal-800',
  entregado: 'bg-gray-100 text-gray-600',
  devuelto: 'bg-red-100 text-red-800',
  irreparable: 'bg-red-200 text-red-900',
}

export const PRIORITY_LABELS: Record<Priority, string> = {
  baja: 'Baja',
  normal: 'Normal',
  alta: 'Alta',
  urgente: 'Urgente',
}

export const PRIORITY_COLORS: Record<Priority, string> = {
  baja: 'text-gray-500',
  normal: 'text-blue-600',
  alta: 'text-orange-600',
  urgente: 'text-red-600',
}

export const EQUIPMENT_TYPES = [
  'PLC',
  'HMI',
  'Variador de frecuencia',
  'Fuente de alimentación',
  'Módulo de E/S',
  'Servo drive',
  'Panel de control',
  'Switch industrial',
  'Router industrial',
  'Sensor / Transductor',
  'Controlador SCADA',
  'Otro',
]

export const ALL_STATUSES: OTStatus[] = [
  'recibido', 'verificando', 'pendiente_verificacion', 'pendiente_aprobacion',
  'esperando_repuestos', 'en_reparacion', 'reparado', 'listo_entrega',
  'entregado', 'devuelto', 'irreparable',
]
