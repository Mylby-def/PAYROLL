import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import api from '../api/client'

interface Log { id: number; user_name: string; action: string; details: string; created_at: string }

export default function ActivityLogPage() {
  const [logs, setLogs] = useState<Log[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/activity-log/').then(r => setLogs(r.data.results || r.data)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400 text-sm">Загрузка...</div>

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Журнал активности</h1>
        <p className="text-sm text-slate-500 mt-0.5">История действий в системе</p>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead><tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-4 py-2 text-left text-[11px] font-semibold text-slate-500 uppercase">Дата</th>
              <th className="px-4 py-2 text-left text-[11px] font-semibold text-slate-500 uppercase">Пользователь</th>
              <th className="px-4 py-2 text-left text-[11px] font-semibold text-slate-500 uppercase">Действие</th>
              <th className="px-4 py-2 text-left text-[11px] font-semibold text-slate-500 uppercase hidden sm:table-cell">Детали</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map(l => (
                <tr key={l.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-2.5 text-xs text-slate-500 whitespace-nowrap">{format(new Date(l.created_at), 'd MMM HH:mm', { locale: ru })}</td>
                  <td className="px-4 py-2.5 text-sm text-slate-900">{l.user_name || '—'}</td>
                  <td className="px-4 py-2.5 text-sm text-slate-700">{l.action}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-400 hidden sm:table-cell max-w-[300px] truncate">{l.details || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {logs.length === 0 && <div className="text-center py-12 text-slate-400 text-sm">Нет записей</div>}
      </div>
    </div>
  )
}
