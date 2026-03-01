import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import api from '../api/client'

interface Stats {
  total_sheets: number
  draft: number
  submitted: number
  approved: number
  rejected: number
  total_basic: number
  total_premium: number
  total_vacation: number
}

export default function DashboardPage() {
  const { user, refreshUser } = useAuthStore()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    refreshUser()
    const fetchStats = async () => {
      try {
        const res = await api.get('/payroll-sheets/')
        const sheets = res.data.results || res.data
        setStats({
          total_sheets: sheets.length,
          draft: sheets.filter((s: any) => s.status === 'draft').length,
          submitted: sheets.filter((s: any) => s.status === 'submitted').length,
          approved: sheets.filter((s: any) => s.status === 'approved').length,
          rejected: sheets.filter((s: any) => s.status === 'rejected').length,
          total_basic: sheets.reduce((s: number, sh: any) => s + parseFloat(sh.total_basic || '0'), 0),
          total_premium: sheets.reduce((s: number, sh: any) => s + parseFloat(sh.total_premium || '0'), 0),
          total_vacation: sheets.reduce((s: number, sh: any) => s + parseFloat(sh.total_vacation || '0'), 0),
        })
      } catch {}
      setLoading(false)
    }
    fetchStats()
  }, [])

  const balance = user?.balance ? parseFloat(user.balance) : 0
  const fmt = (v: number) => v.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB' })

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-500">Загрузка...</div>

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Дашборд</h1>
        <p className="text-slate-500 mt-1">Добро пожаловать, {user?.first_name || user?.username}</p>
      </div>

      {/* Balance Card */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 rounded-2xl p-6 mb-8 text-white shadow-lg shadow-indigo-500/20">
        <p className="text-indigo-200 text-sm font-medium">Ваш баланс</p>
        <p className="text-3xl font-bold mt-1">{fmt(balance)}</p>
        <div className="flex gap-8 mt-4">
          <div>
            <p className="text-indigo-200 text-xs">Заработано (основные)</p>
            <p className="text-lg font-semibold">{fmt(stats?.total_basic || 0)}</p>
          </div>
          <div>
            <p className="text-indigo-200 text-xs">Премиальные</p>
            <p className="text-lg font-semibold">{fmt(stats?.total_premium || 0)}</p>
          </div>
          <div>
            <p className="text-indigo-200 text-xs">Отпускные</p>
            <p className="text-lg font-semibold">{fmt(stats?.total_vacation || 0)}</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {[
          { label: 'Всего РЛ', value: stats?.total_sheets || 0, color: 'bg-slate-100 text-slate-700' },
          { label: 'Черновики', value: stats?.draft || 0, color: 'bg-amber-50 text-amber-700' },
          { label: 'На проверке', value: stats?.submitted || 0, color: 'bg-blue-50 text-blue-700' },
          { label: 'Одобрено', value: stats?.approved || 0, color: 'bg-emerald-50 text-emerald-700' },
          { label: 'Отклонено', value: stats?.rejected || 0, color: 'bg-red-50 text-red-700' },
        ].map((item, i) => (
          <div key={i} className={`rounded-xl p-4 ${item.color}`}>
            <p className="text-2xl font-bold">{item.value}</p>
            <p className="text-sm mt-1 opacity-80">{item.label}</p>
          </div>
        ))}
      </div>

      {user?.role === 'teacher' && (
        <Link
          to="/payroll-sheets/new"
          className="inline-flex items-center px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/20 transition"
        >
          Создать расчётный лист
        </Link>
      )}
    </div>
  )
}
