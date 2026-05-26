import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, CheckCircle2, Circle, Clock, X, Calendar, ChevronLeft, ChevronRight as ChevronR } from 'lucide-react'
import api from '../lib/api'

type TStatus = 'pendiente' | 'en_progreso' | 'completada'
type TPriority = 'baja' | 'normal' | 'alta'

interface Task {
  id: number; title: string; description?: string
  status: TStatus; priority: TPriority
  due_date?: string; assigned_to?: { id: number; name: string }
  created_by: { id: number; name: string }
  work_order?: { id: number; ot_number: string }
  created_at: string
}

const P_COLORS: Record<TPriority, string> = { baja: 'text-gray-400', normal: 'text-blue-500', alta: 'text-red-500' }
const S_ICONS: Record<TStatus, React.ElementType> = {
  pendiente: Circle, en_progreso: Clock, completada: CheckCircle2,
}
const S_COLORS: Record<TStatus, string> = {
  pendiente: 'text-gray-400', en_progreso: 'text-blue-500', completada: 'text-green-500',
}

function TaskForm({ initial, users, onSave, onCancel }: {
  initial?: Partial<Task> & { work_order_id?: number }
  users: any[]; onSave: (d: any) => void; onCancel: () => void
}) {
  const [form, setForm] = useState({
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    priority: initial?.priority ?? 'normal',
    status: initial?.status ?? 'pendiente',
    due_date: initial?.due_date ? initial.due_date.slice(0, 16) : '',
    assigned_to_id: initial?.assigned_to?.id ?? '',
    work_order_id: initial?.work_order_id ?? initial?.work_order?.id ?? '',
  })
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900">{initial?.id ? 'Editar tarea' : 'Nueva tarea'}</h2>
          <button onClick={onCancel}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Título *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Descripción</label>
            <textarea rows={2} value={form.description} onChange={e => set('description', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Prioridad</label>
              <select value={form.priority} onChange={e => set('priority', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none">
                <option value="baja">Baja</option>
                <option value="normal">Normal</option>
                <option value="alta">Alta</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Estado</label>
              <select value={form.status} onChange={e => set('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none">
                <option value="pendiente">Pendiente</option>
                <option value="en_progreso">En progreso</option>
                <option value="completada">Completada</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Fecha límite</label>
              <input type="datetime-local" value={form.due_date} onChange={e => set('due_date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Asignado a</label>
              <select value={form.assigned_to_id} onChange={e => set('assigned_to_id', e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none">
                <option value="">Sin asignar</option>
                {users.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onCancel} className="flex-1 py-2 border border-gray-200 text-sm rounded-lg text-gray-600">Cancelar</button>
          <button onClick={() => onSave(form)} disabled={!form.title.trim()}
            className="flex-1 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50">
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}

function MiniCalendar({ tasks }: { tasks: Task[] }) {
  const [cur, setCur] = useState(() => new Date())
  const year = cur.getFullYear(); const month = cur.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = new Date()

  const taskDays = new Set(
    tasks.filter(t => t.due_date && t.status !== 'completada')
         .map(t => new Date(t.due_date!).getDate() + '-' + new Date(t.due_date!).getMonth() + '-' + new Date(t.due_date!).getFullYear())
  )

  const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setCur(new Date(year, month - 1))}><ChevronLeft className="w-4 h-4 text-gray-400" /></button>
        <p className="text-sm font-semibold">{MONTHS[month]} {year}</p>
        <button onClick={() => setCur(new Date(year, month + 1))}><ChevronR className="w-4 h-4 text-gray-400" /></button>
      </div>
      <div className="grid grid-cols-7 text-center text-xs text-gray-400 mb-1">
        {['Do','Lu','Ma','Mi','Ju','Vi','Sá'].map(d => <span key={d}>{d}</span>)}
      </div>
      <div className="grid grid-cols-7 text-center text-xs gap-y-1">
        {Array.from({ length: firstDay }).map((_, i) => <span key={`e${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1
          const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear()
          const hasTask = taskDays.has(`${day}-${month}-${year}`)
          return (
            <div key={day} className="relative flex items-center justify-center">
              <span className={`w-7 h-7 flex items-center justify-center rounded-full text-xs ${isToday ? 'bg-blue-600 text-white font-bold' : 'hover:bg-gray-100'}`}>
                {day}
              </span>
              {hasTask && <span className="absolute bottom-0 right-1 w-1.5 h-1.5 rounded-full bg-orange-400" />}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function Tasks() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)
  const [filterStatus, setFilterStatus] = useState<TStatus | ''>('')

  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ['tasks', filterStatus],
    queryFn: () => api.get('/tasks', { params: { status: filterStatus || undefined } }).then(r => r.data),
  })

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (d: any) => api.post('/tasks', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); setShowForm(false) },
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, ...d }: any) => api.put(`/tasks/${id}`, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); setEditing(null) },
  })
  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/tasks/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })
  const toggleStatus = (task: Task) => {
    const next: TStatus = task.status === 'completada' ? 'pendiente' : task.status === 'pendiente' ? 'en_progreso' : 'completada'
    updateMutation.mutate({ id: task.id, status: next })
  }

  const pending = tasks.filter(t => t.status === 'pendiente').length
  const inProgress = tasks.filter(t => t.status === 'en_progreso').length
  const overdue = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completada').length

  return (
    <div className="max-w-5xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-indigo-500" /> Tareas y Calendario
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">{pending} pendientes · {inProgress} en progreso{overdue > 0 ? ` · ${overdue} vencidas` : ''}</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Nueva tarea
        </button>
      </div>

      <div className="grid lg:grid-cols-4 gap-5">
        <div className="lg:col-span-3 space-y-3">
          {/* Filter tabs */}
          <div className="flex gap-2 flex-wrap">
            {[['', 'Todas'], ['pendiente', 'Pendientes'], ['en_progreso', 'En progreso'], ['completada', 'Completadas']].map(([v, l]) => (
              <button key={v} onClick={() => setFilterStatus(v as TStatus | '')}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${filterStatus === v ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {l}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
          ) : (
            <div className="space-y-2">
              {tasks.map(task => {
                const StatusIcon = S_ICONS[task.status]
                const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completada'
                return (
                  <div key={task.id}
                    className={`flex items-start gap-3 bg-white rounded-xl border px-4 py-3 hover:border-blue-200 transition-colors ${isOverdue ? 'border-red-200 bg-red-50' : 'border-gray-200'}`}>
                    <button onClick={() => toggleStatus(task)} className={`mt-0.5 ${S_COLORS[task.status]}`}>
                      <StatusIcon className="w-5 h-5" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`font-medium text-sm ${task.status === 'completada' ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                          {task.title}
                        </p>
                        <span className={`text-xs font-semibold ${P_COLORS[task.priority]}`}>
                          {task.priority === 'alta' ? '⚡' : ''}{task.priority}
                        </span>
                      </div>
                      {task.description && <p className="text-xs text-gray-500 mt-0.5 truncate">{task.description}</p>}
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                        {task.assigned_to && <span>→ {task.assigned_to.name}</span>}
                        {task.work_order && (
                          <span className="text-blue-500">OT: {task.work_order.ot_number}</span>
                        )}
                        {task.due_date && (
                          <span className={isOverdue ? 'text-red-500 font-semibold' : ''}>
                            {isOverdue ? '⚠ ' : ''}
                            {new Date(task.due_date).toLocaleDateString('es')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => setEditing(task)} className="text-xs text-gray-400 hover:text-gray-600">Editar</button>
                      <button onClick={() => deleteMutation.mutate(task.id)} className="text-xs text-red-400 hover:text-red-600">×</button>
                    </div>
                  </div>
                )
              })}
              {tasks.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No hay tareas</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar calendar */}
        <div className="space-y-4">
          <MiniCalendar tasks={tasks} />
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">Próximas tareas</h3>
            <div className="space-y-2">
              {tasks
                .filter(t => t.due_date && t.status !== 'completada')
                .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
                .slice(0, 5)
                .map(t => (
                  <div key={t.id} className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${new Date(t.due_date!) < new Date() ? 'bg-red-400' : 'bg-blue-400'}`} />
                    <p className="text-xs text-gray-600 truncate flex-1">{t.title}</p>
                    <p className="text-xs text-gray-400 shrink-0">{new Date(t.due_date!).toLocaleDateString('es', { day: '2-digit', month: '2-digit' })}</p>
                  </div>
                ))}
              {!tasks.filter(t => t.due_date && t.status !== 'completada').length && (
                <p className="text-xs text-gray-400">Sin tareas pendientes</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {showForm && <TaskForm users={users} onSave={d => createMutation.mutate(d)} onCancel={() => setShowForm(false)} />}
      {editing && <TaskForm initial={editing} users={users} onSave={d => updateMutation.mutate({ id: editing.id, ...d })} onCancel={() => setEditing(null)} />}
    </div>
  )
}
