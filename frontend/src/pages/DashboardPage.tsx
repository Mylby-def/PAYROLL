import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import api from '../api/client'

interface Stats {
  total: number; draft: number; submitted: number; approved: number; rejected: number
  basic: number; premium: number; vacation: number
}

export default function DashboardPage() {
  const { user, refreshUser } = useAuthStore()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    refreshUser()
    api.get('/payroll-sheets/').then((r) => {
      const s = r.data.results || r.data
      setStats({
        total: s.length, draft: s.filter((x: any) => x.status === 'draft').length,
        submitted: s.filter((x: any) => x.status === 'submitted').length,
        approved: s.filter((x: any) => x.status === 'approved').length,
        rejected: s.filter((x: any) => x.status === 'rejected').length,
        basic: s.reduce((a: number, x: any) => a + parseFloat(x.total_basic || '0'), 0),
        premium: s.reduce((a: number, x: any) => a + parseFloat(x.total_premium || '0'), 0),
        vacation: s.reduce((a: number, x: any) => a + parseFloat(x.total_vacation || '0'), 0),
      })
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const bal = (v?: string) => parseFloat(v || '0')
  const fmt = (v: number) => v.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB' })

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400 text-sm">Загрузка...</div>

  return (
    <div className="max-w-5xl">
      <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mb-1">Дашборд</h1>
      <p className="text-sm text-slate-500 mb-6">Добро пожаловать, {user?.first_name || user?.username}</p>

      {/* Balance cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-500 rounded-2xl p-5 text-white shadow-lg shadow-indigo-500/20">
          <p className="text-indigo-200 text-xs font-medium uppercase tracking-wider">Основной счёт</p>
          <p className="text-2xl font-bold mt-1">{fmt(bal(user?.balance))}</p>
          <p className="text-xs text-indigo-200 mt-2">Заработано: {fmt(stats?.basic || 0)}</p>
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-5 text-white shadow-lg shadow-amber-500/20">
          <p className="text-amber-100 text-xs font-medium uppercase tracking-wider">Премиальные</p>
          <p className="text-2xl font-bold mt-1">{fmt(bal(user?.balance_premium))}</p>
          <p className="text-xs text-amber-100 mt-2">Начислено: {fmt(stats?.premium || 0)}</p>
        </div>
        <div className="bg-gradient-to-br from-sky-500 to-cyan-500 rounded-2xl p-5 text-white shadow-lg shadow-sky-500/20">
          <p className="text-sky-100 text-xs font-medium uppercase tracking-wider">Отпускные</p>
          <p className="text-2xl font-bold mt-1">{fmt(bal(user?.balance_vacation))}</p>
          <p className="text-xs text-sky-100 mt-2">Начислено: {fmt(stats?.vacation || 0)}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-6">
        {[
          { l: 'Всего РЛ', v: stats?.total || 0, c: 'bg-slate-50 text-slate-700 border-slate-200' },
          { l: 'Черновики', v: stats?.draft || 0, c: 'bg-slate-50 text-amber-700 border-amber-200' },
          { l: 'На проверке', v: stats?.submitted || 0, c: 'bg-blue-50 text-blue-700 border-blue-200' },
          { l: 'Одобрено', v: stats?.approved || 0, c: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
          { l: 'Отклонено', v: stats?.rejected || 0, c: 'bg-red-50 text-red-700 border-red-200' },
        ].map((s, i) => (
          <div key={i} className={`rounded-xl p-3 border ${s.c}`}>
            <p className="text-xl font-bold">{s.v}</p>
            <p className="text-[11px] mt-0.5 opacity-70">{s.l}</p>
          </div>
        ))}
      </div>

      {user?.role === 'teacher' && (
        <Link to="/payroll-sheets/new" className="inline-flex items-center px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/20 transition">
          Создать расчётный лист
        </Link>
      )}
    </div>
  )
}
