import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useEffect, useState } from 'react'
import api from '../api/client'

const RL: Record<string, string> = {
  teacher: 'Педагог', employee: 'Сотрудник', administrator: 'Администратор', accountant: 'Бухгалтер',
  senior_admin: 'Ст. администратор', chief_admin: 'Гл. администратор', moderator: 'Модератор',
}

interface NI { to: string; label: string; icon: string; roles?: string[] }

const NAV: NI[] = [
  { to: '/', label: 'Дашборд', icon: '◫' },
  { to: '/payroll-sheets', label: 'Расчётные листы', icon: '◱', roles: ['teacher', 'employee', 'moderator', 'accountant', 'senior_admin', 'chief_admin'] },
  { to: '/approval', label: 'Одобрение РЛ', icon: '◉', roles: ['accountant', 'senior_admin', 'chief_admin', 'moderator'] },
  { to: '/finance', label: 'Финансы', icon: '₽', roles: ['senior_admin', 'chief_admin', 'moderator'] },
  { to: '/branches', label: 'Филиалы', icon: '⊞', roles: ['administrator', 'senior_admin', 'chief_admin', 'moderator'] },
  { to: '/transactions', label: 'Транзакции', icon: '⇄', roles: ['teacher', 'employee', 'accountant', 'senior_admin', 'chief_admin', 'moderator'] },
  { to: '/profiles', label: 'Пользователи', icon: '◑', roles: ['senior_admin', 'chief_admin', 'moderator'] },
  { to: '/admins', label: 'Администраторы', icon: '⚑', roles: ['senior_admin', 'chief_admin', 'moderator'] },
  { to: '/teachers', label: 'Педагоги', icon: '◐', roles: ['accountant', 'senior_admin', 'chief_admin', 'moderator'] },
  { to: '/subjects', label: 'Предметы', icon: '▦', roles: ['accountant', 'chief_admin', 'moderator'] },
  { to: '/rates', label: 'Цены', icon: '◈', roles: ['accountant', 'chief_admin', 'moderator'] },
  { to: '/cities', label: 'Города', icon: '⌂', roles: ['chief_admin', 'moderator'] },
  { to: '/activity', label: 'Журнал', icon: '☰', roles: ['senior_admin', 'chief_admin', 'moderator'] },
]

export default function Layout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [notifCount, setNotifCount] = useState(0)

  useEffect(() => {
    api.get('/notifications/', { params: { is_read: false } }).then(r => {
      const data = r.data.results || r.data
      setNotifCount(Array.isArray(data) ? data.filter((n: any) => !n.is_read).length : 0)
    }).catch(() => {})
  }, [location.pathname])

  const role = user?.role || 'teacher'
  const items = NAV.filter(i => !i.roles || i.roles.includes(role))
  const b = (v?: string) => parseFloat(v || '0')
  const f = (v: number) => v.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' ₽'

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {open && <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setOpen(false)} />}

      <aside className={`fixed inset-y-0 left-0 z-50 w-60 bg-gradient-to-b from-slate-900 via-slate-850 to-slate-800 text-white transform transition-transform duration-200 lg:translate-x-0 lg:static lg:z-auto flex flex-col ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between h-12 px-4 border-b border-white/10 flex-shrink-0">
          <Link to="/" className="text-base font-bold bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">Payroll</Link>
          <button onClick={() => setOpen(false)} className="lg:hidden text-slate-400 hover:text-white">✕</button>
        </div>

        <div className="px-3 py-2.5 border-b border-white/10 flex-shrink-0">
          <div className="bg-white/5 rounded-lg p-2.5">
            <p className="text-xs font-semibold truncate">{user?.first_name || user?.username}</p>
            <p className="text-[10px] text-slate-400">{RL[role]}{user?.city ? ` · ${user.city}` : ''}</p>
            <div className="grid grid-cols-3 gap-1 mt-2 pt-2 border-t border-white/10">
              {[{ l: 'Осн', v: b(user?.balance), c: 'text-emerald-400' },
                { l: 'Прем', v: b(user?.balance_premium), c: 'text-amber-400' },
                { l: 'Отп', v: b(user?.balance_vacation), c: 'text-sky-400' }].map((x, i) => (
                <div key={i}><p className="text-[8px] text-slate-500 uppercase">{x.l}</p><p className={`text-[11px] font-bold ${x.c}`}>{f(x.v)}</p></div>
              ))}
            </div>
          </div>
        </div>

        <nav className="flex-1 px-2.5 py-2 space-y-px overflow-y-auto">
          {items.map(i => {
            const a = i.to === '/' ? location.pathname === '/' : location.pathname.startsWith(i.to)
            return (
              <Link key={i.to} to={i.to} onClick={() => setOpen(false)}
                className={`flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg text-[12px] font-medium transition-all ${a ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                <span className="text-sm w-4 text-center opacity-60">{i.icon}</span>{i.label}
              </Link>
            )
          })}
        </nav>

        <div className="p-2.5 border-t border-white/10 flex-shrink-0 space-y-1">
          <Link to="/settings" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg text-[12px] font-medium text-slate-400 hover:bg-white/5 hover:text-white transition-all">
            <span className="text-sm w-4 text-center opacity-60">⚙</span>Настройки
          </Link>
          <button onClick={async () => { await logout(); navigate('/login') }}
            className="w-full flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg text-[12px] font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all">
            <span className="text-sm w-4 text-center opacity-60">⏻</span>Выйти
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200/80">
          <div className="flex items-center justify-between h-11 px-3 sm:px-5">
            <button onClick={() => setOpen(true)} className="lg:hidden p-1 rounded-md text-slate-500 hover:bg-slate-100">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/></svg>
            </button>
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              {notifCount > 0 && (
                <Link to="/notifications" className="relative p-1">
                  <span className="text-slate-500 text-sm">🔔</span>
                  <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] w-3.5 h-3.5 rounded-full flex items-center justify-center font-bold">{notifCount}</span>
                </Link>
              )}
              <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${
                role === 'moderator' ? 'bg-purple-500' : role === 'chief_admin' ? 'bg-amber-500' :
                role === 'senior_admin' ? 'bg-blue-500' : role === 'accountant' ? 'bg-teal-500' : 'bg-indigo-500'
              }`}>{(user?.first_name || user?.username || '?')[0].toUpperCase()}</div>
            </div>
          </div>
        </header>
        <main className="flex-1 p-3 sm:p-4 lg:p-6"><Outlet /></main>
      </div>
    </div>
  )
}
