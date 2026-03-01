import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import api from '../api/client'

interface Stats { total: number; draft: number; submitted: number; approved: number; rejected: number; basic: number; premium: number; vacation: number }
interface BranchInfo { id: number; name: string; balance: string }
interface CityInfo { id: number; name: string; total_balance: string; branches: BranchInfo[] }

export default function DashboardPage() {
  const { user, refreshUser } = useAuthStore()
  const [stats, setStats] = useState<Stats | null>(null)
  const [branches, setBranches] = useState<BranchInfo[]>([])
  const [cityName, setCityName] = useState('')
  const [cities, setCities] = useState<CityInfo[]>([])
  const [expandedCity, setExpandedCity] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    refreshUser()
    Promise.all([
      api.get('/payroll-sheets/'),
      api.get('/dashboard/stats/').catch(() => ({ data: {} })),
    ]).then(([sheetsR, statsR]) => {
      const s = sheetsR.data.results || sheetsR.data
      setStats({
        total: s.length, draft: s.filter((x: any) => x.status === 'draft').length,
        submitted: s.filter((x: any) => x.status === 'submitted').length,
        approved: s.filter((x: any) => x.status === 'approved').length,
        rejected: s.filter((x: any) => x.status === 'rejected').length,
        basic: s.reduce((a: number, x: any) => a + parseFloat(x.total_basic || '0'), 0),
        premium: s.reduce((a: number, x: any) => a + parseFloat(x.total_premium || '0'), 0),
        vacation: s.reduce((a: number, x: any) => a + parseFloat(x.total_vacation || '0'), 0),
      })
      const d = statsR.data
      if (d.branches) { setBranches(d.branches); setCityName(d.city_name || '') }
      if (d.cities) setCities(d.cities)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const b = (v?: string) => parseFloat(v || '0')
  const f = (v: number) => v.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB' })
  const role = user?.role || 'teacher'

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400 text-sm">Загрузка...</div>

  return (
    <div className="max-w-5xl">
      <h1 className="text-xl font-bold text-slate-900 mb-1">Дашборд</h1>
      <p className="text-sm text-slate-500 mb-5">Добро пожаловать, {user?.first_name || user?.username}</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-500 rounded-2xl p-4 text-white shadow-lg shadow-indigo-500/20">
          <p className="text-indigo-200 text-[10px] font-semibold uppercase tracking-wider">Основной счёт</p>
          <p className="text-2xl font-bold mt-1">{f(b(user?.balance))}</p>
          <p className="text-[11px] text-indigo-200 mt-1.5">Заработано: {f(stats?.basic || 0)}</p>
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-4 text-white shadow-lg shadow-amber-500/20">
          <p className="text-amber-100 text-[10px] font-semibold uppercase tracking-wider">Премиальные</p>
          <p className="text-2xl font-bold mt-1">{f(b(user?.balance_premium))}</p>
          <p className="text-[11px] text-amber-100 mt-1.5">Начислено: {f(stats?.premium || 0)}</p>
        </div>
        <div className="bg-gradient-to-br from-sky-500 to-cyan-500 rounded-2xl p-4 text-white shadow-lg shadow-sky-500/20">
          <p className="text-sky-100 text-[10px] font-semibold uppercase tracking-wider">Отпускные</p>
          <p className="text-2xl font-bold mt-1">{f(b(user?.balance_vacation))}</p>
          <p className="text-[11px] text-sky-100 mt-1.5">Начислено: {f(stats?.vacation || 0)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-5">
        {[
          { l: 'Всего РЛ', v: stats?.total, c: 'border-slate-200' },
          { l: 'Черновики', v: stats?.draft, c: 'border-amber-200 bg-amber-50/50' },
          { l: 'На проверке', v: stats?.submitted, c: 'border-blue-200 bg-blue-50/50' },
          { l: 'Одобрено', v: stats?.approved, c: 'border-emerald-200 bg-emerald-50/50' },
          { l: 'Отклонено', v: stats?.rejected, c: 'border-red-200 bg-red-50/50' },
        ].map((s, i) => (
          <div key={i} className={`rounded-xl p-3 border ${s.c} bg-white`}>
            <p className="text-xl font-bold text-slate-900">{s.v || 0}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{s.l}</p>
          </div>
        ))}
      </div>

      {/* Senior admin: branch finances */}
      {role === 'senior_admin' && branches.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">Филиалы — {cityName}</h2>
          <div className="space-y-2">
            {branches.map(br => (
              <div key={br.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-sm text-slate-700">{br.name}</span>
                <span className={`text-sm font-bold ${parseFloat(br.balance) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{f(parseFloat(br.balance))}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chief admin / moderator: city finances */}
      {(role === 'chief_admin' || role === 'moderator') && cities.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">Финансы по городам</h2>
          <div className="space-y-2">
            {cities.map(city => (
              <div key={city.id}>
                <button onClick={() => setExpandedCity(expandedCity === city.id ? null : city.id)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-colors text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">{expandedCity === city.id ? '▼' : '▶'}</span>
                    <span className="text-sm font-medium text-slate-700">{city.name}</span>
                    <span className="text-[10px] text-slate-400">{city.branches.length} филиал(ов)</span>
                  </div>
                  <span className={`text-sm font-bold ${parseFloat(city.total_balance) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{f(parseFloat(city.total_balance))}</span>
                </button>
                {expandedCity === city.id && city.branches.length > 0 && (
                  <div className="ml-6 mt-1 space-y-1">
                    {city.branches.map(br => (
                      <div key={br.id} className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-white border border-slate-100">
                        <span className="text-xs text-slate-600">{br.name}</span>
                        <span className={`text-xs font-semibold ${parseFloat(br.balance) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{f(parseFloat(br.balance))}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {['teacher', 'employee', 'moderator'].includes(role) && (
        <Link to="/payroll-sheets/new" className="inline-flex items-center px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/20 transition">
          Создать расчётный лист
        </Link>
      )}
    </div>
  )
}
