import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { useAuthStore } from '../store/authStore'
import api from '../api/client'

interface Sheet {
  id: number; title: string; teacher_name?: string; period_start: string; period_end: string
  status: string; total_basic: string; entries_count: number; created_at: string
}

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  submitted: 'bg-blue-100 text-blue-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  paid: 'bg-purple-100 text-purple-700',
}
const STATUS_LABEL: Record<string, string> = {
  draft: 'Черновик', submitted: 'На проверке', approved: 'Одобрен', rejected: 'Отклонён', paid: 'Оплачен',
}

export default function PayrollSheetsPage() {
  const { user } = useAuthStore()
  const [sheets, setSheets] = useState<Sheet[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchSheets() }, [])

  const fetchSheets = async () => {
    try {
      const r = await api.get('/payroll-sheets/')
      setSheets(r.data.results || r.data)
    } catch {}
    setLoading(false)
  }

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm('Удалить?')) return
    await api.delete(`/payroll-sheets/${id}/`).catch(() => {})
    fetchSheets()
  }

  const fmt = (v: string) => parseFloat(v || '0').toLocaleString('ru-RU', { style: 'currency', currency: 'RUB' })

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-500">Загрузка...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Расчётные листы</h1>
        {(['teacher', 'employee', 'moderator'].includes(user?.role || '')) && (
          <Link to="/payroll-sheets/new" className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm transition">
            Создать новый
          </Link>
        )}
      </div>

      <div className="space-y-3">
        {sheets.map((s) => (
          <Link key={s.id} to={`/payroll-sheets/${s.id}`} className="block bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition p-5">
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-slate-900 truncate">{s.title}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${STATUS_BADGE[s.status] || 'bg-slate-100'}`}>
                    {STATUS_LABEL[s.status] || s.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {format(new Date(s.period_start), 'd MMM', { locale: ru })} — {format(new Date(s.period_end), 'd MMM yyyy', { locale: ru })}
                  {s.entries_count > 0 && <> &middot; {s.entries_count} записей</>}
                </p>
              </div>
              <div className="flex items-center gap-3 ml-4">
                <span className="text-sm font-bold text-slate-900">{fmt(s.total_basic)}</span>
                {s.status === 'draft' && (
                  <button onClick={(e) => handleDelete(e, s.id)} className="text-xs text-red-500 hover:text-red-700 transition">
                    Удалить
                  </button>
                )}
              </div>
            </div>
          </Link>
        ))}
        {sheets.length === 0 && <div className="text-center py-16 text-slate-400">Нет расчётных листов</div>}
      </div>
    </div>
  )
}
