import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import api from '../api/client'

interface Notif { id: number; title: string; message: string; is_read: boolean; link: string; created_at: string }

export default function NotificationsPage() {
  const [notifs, setNotifs] = useState<Notif[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/notifications/').then(r => setNotifs(r.data.results || r.data)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const markRead = async (id: number) => {
    await api.post(`/notifications/${id}/mark_read/`).catch(() => {})
    setNotifs(p => p.map(n => n.id === id ? { ...n, is_read: true } : n))
  }

  const markAllRead = async () => {
    await api.post('/notifications/mark_all_read/').catch(() => {})
    setNotifs(p => p.map(n => ({ ...n, is_read: true })))
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400 text-sm">Загрузка...</div>

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Уведомления</h1>
          <p className="text-sm text-slate-500 mt-0.5">Сообщения и оповещения</p>
        </div>
        {notifs.some(n => !n.is_read) && (
          <button onClick={markAllRead} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition">Прочитать все</button>
        )}
      </div>
      <div className="space-y-2">
        {notifs.map(n => (
          <div key={n.id} onClick={() => !n.is_read && markRead(n.id)}
            className={`rounded-2xl border p-5 transition-all cursor-pointer ${n.is_read ? 'bg-white border-slate-200 shadow-sm hover:shadow-md' : 'bg-indigo-50/50 border-indigo-200 shadow-sm'}`}>
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${n.is_read ? 'text-slate-700' : 'text-slate-900'}`}>{n.title}</p>
                {n.message && <p className="text-xs text-slate-500 mt-0.5">{n.message}</p>}
              </div>
              <span className="text-[10px] text-slate-400 ml-3 flex-shrink-0">{format(new Date(n.created_at), 'd MMM HH:mm', { locale: ru })}</span>
            </div>
            {n.link && <Link to={n.link} className="text-[11px] text-indigo-600 hover:text-indigo-800 mt-1 inline-block">Перейти →</Link>}
          </div>
        ))}
        {notifs.length === 0 && <div className="text-center py-16 text-slate-400 text-sm">Нет уведомлений</div>}
      </div>
    </div>
  )
}
