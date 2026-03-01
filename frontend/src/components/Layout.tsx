import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useState } from 'react'

const ROLE_LABELS: Record<string, string> = {
  teacher: 'Педагог', administrator: 'Администратор', accountant: 'Бухгалтер',
  senior_admin: 'Ст. администратор', chief_admin: 'Гл. администратор', moderator: 'Модератор',
}

interface NavItem { to: string; label: string; icon: string; roles?: string[] }

const NAV: NavItem[] = [
  { to: '/', label: 'Дашборд', icon: '◫' },
  { to: '/payroll-sheets', label: 'Расчётные листы', icon: '◱', roles: ['teacher', 'accountant', 'senior_admin', 'chief_admin', 'moderator'] },
  { to: '/approval', label: 'Одобрение РЛ', icon: '◉', roles: ['accountant', 'senior_admin', 'chief_admin', 'moderator'] },
  { to: '/finance', label: 'Финансы', icon: '₽', roles: ['senior_admin', 'chief_admin', 'moderator'] },
  { to: '/transactions', label: 'Транзакции', icon: '⇄', roles: ['teacher', 'accountant', 'senior_admin', 'chief_admin', 'moderator'] },
  { to: '/profiles', label: 'Пользователи', icon: '◑', roles: ['senior_admin', 'chief_admin', 'moderator'] },
  { to: '/teachers', label: 'Педагоги', icon: '◐', roles: ['accountant', 'senior_admin', 'chief_admin', 'moderator'] },
  { to: '/subjects', label: 'Предметы', icon: '▦', roles: ['accountant', 'chief_admin', 'moderator'] },
  { to: '/rates', label: 'Цены', icon: '◈', roles: ['accountant', 'chief_admin', 'moderator'] },
  { to: '/cities', label: 'Города', icon: '⌂', roles: ['chief_admin', 'moderator'] },
]

export default function Layout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)

  const role = user?.role || 'teacher'
  const items = NAV.filter((i) => !i.roles || i.roles.includes(role))
  const bal = (v?: string) => parseFloat(v || '0')
  const fmt = (v: number) => v.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB' })

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {open && <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setOpen(false)} />}

      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-slate-900 via-slate-850 to-slate-800 text-white transform transition-transform duration-200 lg:translate-x-0 lg:static lg:z-auto flex flex-col ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between h-14 px-5 border-b border-white/10 flex-shrink-0">
          <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">Payroll</h1>
          <button onClick={() => setOpen(false)} className="lg:hidden text-slate-400 hover:text-white text-lg">✕</button>
        </div>

        <div className="px-3 py-3 border-b border-white/10 flex-shrink-0">
          <div className="bg-white/5 backdrop-blur rounded-xl p-3">
            <p className="text-sm font-semibold truncate">{user?.first_name || user?.username}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{ROLE_LABELS[role]}</p>
            {user?.city && <p className="text-[10px] text-slate-500">{user.city}</p>}
            <div className="grid grid-cols-3 gap-1.5 mt-2.5 pt-2.5 border-t border-white/10">
              <div>
                <p className="text-[9px] text-slate-500 uppercase tracking-wider">Основной</p>
                <p className={`text-xs font-bold ${bal(user?.balance) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmt(bal(user?.balance))}</p>
              </div>
              <div>
                <p className="text-[9px] text-slate-500 uppercase tracking-wider">Премия</p>
                <p className="text-xs font-bold text-amber-400">{fmt(bal(user?.balance_premium))}</p>
              </div>
              <div>
                <p className="text-[9px] text-slate-500 uppercase tracking-wider">Отпуск</p>
                <p className="text-xs font-bold text-sky-400">{fmt(bal(user?.balance_vacation))}</p>
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {items.map((i) => {
            const active = i.to === '/' ? location.pathname === '/' : location.pathname.startsWith(i.to)
            return (
              <Link key={i.to} to={i.to} onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all ${
                  active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}>
                <span className="text-sm w-5 text-center opacity-70">{i.icon}</span>{i.label}
              </Link>
            )
          })}
        </nav>

        <div className="p-3 border-t border-white/10 flex-shrink-0">
          <button onClick={async () => { await logout(); navigate('/login') }}
            className="w-full px-3 py-2 rounded-lg text-[13px] font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all">
            Выйти
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between h-12 px-4 sm:px-6">
            <button onClick={() => setOpen(true)} className="lg:hidden p-1.5 rounded-md text-slate-500 hover:bg-slate-100 transition">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/></svg>
            </button>
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 hidden sm:block">{user?.first_name || user?.username}</span>
              <div className={`h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white ${
                role === 'moderator' ? 'bg-purple-500' : role === 'chief_admin' ? 'bg-amber-500' :
                role === 'senior_admin' ? 'bg-blue-500' : role === 'accountant' ? 'bg-teal-500' : 'bg-indigo-500'
              }`}>{(user?.first_name || user?.username || '?')[0].toUpperCase()}</div>
            </div>
          </div>
        </header>
        <main className="flex-1 p-3 sm:p-5 lg:p-6"><Outlet /></main>
      </div>
    </div>
  )
}
