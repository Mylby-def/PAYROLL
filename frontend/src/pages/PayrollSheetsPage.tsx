import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { useAuthStore } from '../store/authStore'
import api from '../api/client'

interface Sheet {
  id: number; title: string; teacher_name?: string; period_start: string; period_end: string
  status: string; total_basic: string; entries_count: number; created_at: string; rejection_comment?: string
}

const SB: Record<string, string> = { draft: 'bg-slate-100 text-slate-600', submitted: 'bg-blue-100 text-blue-700', approved: 'bg-emerald-100 text-emerald-700', rejected: 'bg-red-100 text-red-700', paid: 'bg-purple-100 text-purple-700' }
const SL: Record<string, string> = { draft: 'Черновик', submitted: 'На проверке', approved: 'Одобрен', rejected: 'Отклонён', paid: 'Оплачен' }

export default function PayrollSheetsPage() {
  const { user } = useAuthStore()
  const [sheets, setSheets] = useState<Sheet[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => { fetch() }, [])

  const fetch = async () => {
    try { const r = await api.get('/payroll-sheets/'); setSheets(r.data.results || r.data) } catch {}
    setLoading(false)
  }

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.preventDefault(); e.stopPropagation()
    if (!confirm('Удалить?')) return
    await api.delete(`/payroll-sheets/${id}/`).catch(() => {})
    fetch()
  }

  const fmt = (v: string) => parseFloat(v || '0').toLocaleString('ru-RU', { style: 'currency', currency: 'RUB' })

  const filtered = sheets.filter(s => {
    if (statusFilter && s.status !== statusFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return s.title.toLowerCase().includes(q) || (s.teacher_name || '').toLowerCase().includes(q)
    }
    return true
  })

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400 text-sm">Загрузка...</div>

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h1 className="text-xl font-bold text-slate-900">Расчётные листы</h1>
        {(['teacher', 'employee', 'moderator'].includes(user?.role || '')) && (
          <Link to="/payroll-sheets/new" className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm transition">Создать новый</Link>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <input type="text" placeholder="Поиск по названию или педагогу..." className="flex-1 min-w-[200px] rounded-xl border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent" value={search} onChange={e => setSearch(e.target.value)} />
        <select className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">Все статусы</option>
          {Object.entries(SL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      <div className="space-y-2">
        {filtered.map(s => (
          <Link key={s.id} to={`/payroll-sheets/${s.id}`} className="block bg-white rounded-xl border border-slate-200 hover:shadow-md hover:border-slate-300 transition p-4">
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-slate-900 truncate">{s.title}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 ${SB[s.status] || 'bg-slate-100'}`}>{SL[s.status] || s.status}</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {format(new Date(s.period_start), 'd MMM', { locale: ru })} — {format(new Date(s.period_end), 'd MMM yyyy', { locale: ru })}
                  {s.entries_count > 0 && <> · {s.entries_count} записей</>}
                </p>
                {s.status === 'rejected' && s.rejection_comment && (
                  <p className="text-[11px] text-red-600 mt-0.5 truncate">Причина: {s.rejection_comment}</p>
                )}
              </div>
              <div className="flex items-center gap-2 ml-3">
                <span className="text-sm font-bold text-slate-900">{fmt(s.total_basic)}</span>
                {s.status === 'draft' && <button onClick={e => handleDelete(e, s.id)} className="text-[10px] text-red-500 hover:text-red-700">Удалить</button>}
              </div>
            </div>
          </Link>
        ))}
        {filtered.length === 0 && <div className="text-center py-16 text-slate-400 text-sm">Нет расчётных листов</div>}
      </div>
    </div>
  )
}
