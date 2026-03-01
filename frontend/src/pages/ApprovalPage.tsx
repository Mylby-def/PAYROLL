import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import api from '../api/client'

interface Sheet {
  id: number
  title: string
  teacher_name?: string
  period_start: string
  period_end: string
  status: string
  total_basic: string
  total_premium: string
  total_vacation: string
  advance_amount: string
}

const STATUS_BADGE: Record<string, string> = {
  submitted: 'bg-blue-100 text-blue-800',
  approved: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-100 text-red-800',
  paid: 'bg-slate-100 text-slate-700',
}
const STATUS_LABEL: Record<string, string> = {
  submitted: 'На проверке',
  approved: 'Одобрен',
  rejected: 'Отклонён',
  paid: 'Оплачен',
}

export default function ApprovalPage() {
  const [sheets, setSheets] = useState<Sheet[]>([])
  const [loading, setLoading] = useState(true)
  const [rejectId, setRejectId] = useState<number | null>(null)
  const [rejectComment, setRejectComment] = useState('')

  useEffect(() => { fetchSheets() }, [])

  const fetchSheets = async () => {
    try {
      const res = await api.get('/payroll-sheets/', { params: { status: 'submitted' } })
      const submitted = res.data.results || res.data
      const resAll = await api.get('/payroll-sheets/')
      const all = (resAll.data.results || resAll.data).filter((s: Sheet) => s.status !== 'draft')
      const combined = [...submitted]
      for (const s of all) {
        if (!combined.find((c: Sheet) => c.id === s.id)) combined.push(s)
      }
      combined.sort((a: Sheet, b: Sheet) => b.id - a.id)
      setSheets(combined)
    } catch {}
    setLoading(false)
  }

  const handleApprove = async (id: number) => {
    try {
      await api.post(`/payroll-sheets/${id}/approve/`)
      fetchSheets()
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Ошибка')
    }
  }

  const handleReject = async () => {
    if (!rejectId || !rejectComment.trim()) return
    try {
      await api.post(`/payroll-sheets/${rejectId}/reject/`, { comment: rejectComment })
      setRejectId(null)
      setRejectComment('')
      fetchSheets()
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Ошибка')
    }
  }

  const fmt = (v: string) => parseFloat(v || '0').toLocaleString('ru-RU', { style: 'currency', currency: 'RUB' })

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-500">Загрузка...</div>

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Одобрение расчётных листов</h1>

      <div className="space-y-4">
        {sheets.map((sheet) => (
          <div key={sheet.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900">{sheet.title}</h3>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {sheet.teacher_name} &middot; {format(new Date(sheet.period_start), 'd MMM', { locale: ru })} — {format(new Date(sheet.period_end), 'd MMM yyyy', { locale: ru })}
                  </p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[sheet.status] || 'bg-slate-100 text-slate-600'}`}>
                  {STATUS_LABEL[sheet.status] || sheet.status}
                </span>
              </div>

              <div className="flex gap-6 mt-4 text-sm">
                <div>
                  <span className="text-slate-500">Основные:</span>
                  <span className="font-semibold text-slate-900 ml-1">{fmt(sheet.total_basic)}</span>
                </div>
                <div>
                  <span className="text-slate-500">Премиальные:</span>
                  <span className="font-semibold text-slate-900 ml-1">{fmt(sheet.total_premium)}</span>
                </div>
                <div>
                  <span className="text-slate-500">Отпускные:</span>
                  <span className="font-semibold text-slate-900 ml-1">{fmt(sheet.total_vacation)}</span>
                </div>
                {parseFloat(sheet.advance_amount || '0') > 0 && (
                  <div>
                    <span className="text-slate-500">Аванс:</span>
                    <span className="font-semibold text-amber-700 ml-1">{fmt(sheet.advance_amount)}</span>
                  </div>
                )}
              </div>

              {sheet.status === 'submitted' && (
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => handleApprove(sheet.id)}
                    className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition shadow-sm"
                  >
                    Одобрить
                  </button>
                  <button
                    onClick={() => setRejectId(sheet.id)}
                    className="px-4 py-2 rounded-lg text-sm font-semibold text-red-700 bg-red-50 hover:bg-red-100 transition"
                  >
                    Отклонить
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        {sheets.length === 0 && (
          <div className="text-center py-16 text-slate-400">Нет расчётных листов для проверки</div>
        )}
      </div>

      {/* Reject modal */}
      {rejectId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Отклонить ведомость</h3>
            <p className="text-sm text-slate-500 mb-4">Укажите причину отклонения. Педагог увидит ваш комментарий.</p>
            <textarea
              className="w-full rounded-xl border border-slate-300 p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              rows={4}
              placeholder="Причина отклонения..."
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
              autoFocus
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleReject}
                disabled={!rejectComment.trim()}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-500 disabled:opacity-50 transition"
              >
                Отклонить
              </button>
              <button
                onClick={() => { setRejectId(null); setRejectComment('') }}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
