import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useState } from 'react'

const ROLE_LABELS: Record<string, string> = {
  teacher: 'Педагог',
  administrator: 'Администратор',
  accountant: 'Бухгалтер',
  senior_admin: 'Ст. администратор',
  chief_admin: 'Гл. администратор',
  moderator: 'Модератор',
}

interface NavItem {
  to: string
  label: string
  icon: string
  roles?: string[]
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Дашборд', icon: '⊞' },
  { to: '/payroll-sheets', label: 'Расчётные листы', icon: '⊟', roles: ['teacher', 'accountant', 'senior_admin', 'chief_admin', 'moderator'] },
  { to: '/approval', label: 'Одобрение РЛ', icon: '✓', roles: ['accountant', 'senior_admin', 'chief_admin', 'moderator'] },
  { to: '/finance', label: 'Финансы', icon: '₽', roles: ['senior_admin', 'chief_admin', 'moderator'] },
  { to: '/teachers', label: 'Педагоги', icon: '⊕', roles: ['accountant', 'senior_admin', 'chief_admin', 'moderator'] },
  { to: '/subjects', label: 'Предметы', icon: '▦', roles: ['accountant', 'chief_admin', 'moderator'] },
  { to: '/rates', label: 'Цены', icon: '◈', roles: ['accountant', 'chief_admin', 'moderator'] },
  { to: '/cities', label: 'Города', icon: '⌂', roles: ['chief_admin', 'moderator'] },
]

export default function Layout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const role = user?.role || 'teacher'
  const visibleNavItems = NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(role)
  )

  const balance = user?.balance ? parseFloat(user.balance) : 0

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-slate-900 to-slate-800 text-white transform transition-transform duration-200 lg:translate-x-0 lg:static lg:z-auto ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-16 px-5 border-b border-slate-700">
          <h1 className="text-lg font-bold tracking-tight">Payroll</h1>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* User card */}
        <div className="px-4 py-4 border-b border-slate-700">
          <div className="bg-slate-700/50 rounded-xl p-3">
            <p className="text-sm font-semibold text-white truncate">{user?.first_name || user?.username}</p>
            <p className="text-xs text-slate-400 mt-0.5">{ROLE_LABELS[role] || role}</p>
            {user?.city && <p className="text-xs text-slate-500 mt-0.5">{user.city}</p>}
            <div className="mt-2 pt-2 border-t border-slate-600">
              <p className="text-xs text-slate-400">Баланс</p>
              <p className={`text-sm font-bold ${balance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {balance.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB' })}
              </p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {visibleNavItems.map((item) => {
            const isActive = item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to)
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                    : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                }`}
              >
                <span className="text-base w-5 text-center">{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-slate-700">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-red-600/20 hover:text-red-300 transition-colors"
          >
            Выйти
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
          <div className="flex items-center justify-between h-14 px-4 sm:px-6">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-md text-slate-600 hover:bg-slate-100"
            >
              ☰
            </button>
            <div className="flex-1" />
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-600 hidden sm:block">
                {user?.first_name || user?.username}
              </span>
              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                role === 'moderator' ? 'bg-purple-500' :
                role === 'chief_admin' ? 'bg-amber-500' :
                role === 'senior_admin' ? 'bg-blue-500' :
                role === 'accountant' ? 'bg-teal-500' :
                'bg-indigo-500'
              }`}>
                {(user?.first_name || user?.username || '?')[0].toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
