export type UserRole = 'admin' | 'supervisor' | 'technician' | 'receptionist'

export interface User {
  id: number
  email: string
  name: string
  role: UserRole
  is_active: boolean
  created_at: string
}

export interface Client {
  id: number
  name: string
  company?: string
  rut?: string
  email?: string
  phone?: string
  address?: string
  notes?: string
  created_at: string
  total_ots: number
}

export type OTStatus =
  | 'recibido'
  | 'verificando'
  | 'pendiente_verificacion'
  | 'pendiente_aprobacion'
  | 'esperando_repuestos'
  | 'en_reparacion'
  | 'reparado'
  | 'listo_entrega'
  | 'entregado'
  | 'devuelto'
  | 'irreparable'

export type Priority = 'baja' | 'normal' | 'alta' | 'urgente'

export interface WorkOrderSummary {
  id: number
  ot_number: string
  client: { id: number; name: string; company?: string }
  equipment_type: string
  brand?: string
  model?: string
  status: OTStatus
  priority: Priority
  assigned_to?: { id: number; name: string }
  received_at: string
  estimated_delivery?: string
}

export interface WorkOrderHistory {
  id: number
  old_status?: OTStatus
  new_status: OTStatus
  notes?: string
  changed_at: string
  changed_by: { id: number; name: string }
}

export interface WorkOrder extends WorkOrderSummary {
  serial_number?: string
  physical_condition?: string
  accessories?: string
  reported_problem: string
  received_by?: { id: number; name: string }
  actual_delivery?: string
  internal_notes?: string
  qr_code_path?: string
  created_at: string
  updated_at?: string
  history: WorkOrderHistory[]
}

export interface KnowledgeEntry {
  id: number
  work_order_id?: number
  equipment_type: string
  brand?: string
  model?: string
  symptoms: string
  diagnosis: string
  solution: string
  components_replaced?: string
  repair_time_hours?: number
  tags?: string
  created_at: string
  created_by: { id: number; name: string }
}

export interface DashboardStats {
  by_status: Record<OTStatus, number>
  total_active: number
  overdue: number
  month_received: number
  month_delivered: number
  monthly_trend: { month: string; ots: number }[]
}
