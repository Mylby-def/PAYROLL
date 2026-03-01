import { useEffect, useState } from 'react'
import { useAuthStore } from '../store/authStore'
import api from '../api/client'

interface UserItem {
  id: number; username: string; full_name: string; role: string
  city_name: string | null; city_id: number | null; is_active: boolean
}
interface City { id: number; name: string }

const ROLE_L: Record<string, string> = {
  teacher: 'Педагог', administrator: 'Администратор', accountant: 'Бухгалтер',
  senior_admin: 'Ст. администратор', chief_admin: 'Гл. администратор', moderator: 'Модератор',
}

const ALL_ROLES = ['teacher', 'administrator', 'accountant', 'senior_admin', 'chief_admin', 'moderator']
const SENIOR_ROLES = ['teacher', 'administrator']

export default function UserProfilesPage() {
  const { user } = useAuthStore()
  const [users, setUsers] = useState<UserItem[]>([])
  const [cities, setCities] = useState<City[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ username: '', password: '', full_name: '', role: 'teacher', city_id: '' })

  const myRole = user?.role || ''
  const isSenior = myRole === 'senior_admin'
  const availableRoles = isSenior ? SENIOR_ROLES : ALL_ROLES

  useEffect(() => {
    Promise.all([api.get('/profiles/'), api.get('/cities/')])
      .then(([uR, cR]) => { setUsers(uR.data); setCities(cR.data.results || cR.data) })
      .catch(() => {}).finally(() => setLoading(false))
  }, [])

  const fetchUsers = async () => {
    try { const r = await api.get('/profiles/'); setUsers(r.data) } catch {}
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/profiles/create/', {
        username: form.username, password: form.password,
        full_name: form.full_name, role: form.role,
        city_id: form.city_id ? parseInt(form.city_id) : null,
      })
      setShowForm(false); setForm({ username: '', password: '', full_name: '', role: 'teacher', city_id: '' })
      fetchUsers()
    } catch (e: any) { alert(e.response?.data?.detail || JSON.stringify(e.response?.data) || 'Ошибка') }
  }

  const handleToggleActive = async (uid: number, active: boolean) => {
    try { await api.patch(`/profiles/${uid}/`, { is_active: !active }); fetchUsers() } catch {}
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400 text-sm">Загрузка...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Пользователи</h1>
        <button onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm transition">
          {showForm ? 'Отмена' : 'Создать'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-6">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">Новый пользователь</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">ФИО</label>
              <input type="text" required className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Логин</label>
              <input type="text" required className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Пароль</label>
              <input type="text" required className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Роль</label>
              <select className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                {availableRoles.map((r) => <option key={r} value={r}>{ROLE_L[r]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Город</label>
              <select className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" value={form.city_id} onChange={(e) => setForm({ ...form, city_id: e.target.value })}>
                <option value="">Не выбран</option>
                {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <button type="submit" className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition">Создать</button>
        </form>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase">Пользователь</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase">Роль</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase hidden sm:table-cell">Город</th>
                <th className="px-4 py-2.5 text-center text-[11px] font-semibold text-slate-500 uppercase">Статус</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-slate-500 uppercase">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-slate-900">{u.full_name}</p>
                    <p className="text-[11px] text-slate-400">@{u.username}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">{ROLE_L[u.role] || u.role}</td>
                  <td className="px-4 py-3 text-xs text-slate-500 hidden sm:table-cell">{u.city_name || '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${u.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {u.is_active ? 'Активен' : 'Заблокирован'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleToggleActive(u.id, u.is_active !== false)}
                      className={`px-2 py-1 rounded text-[10px] font-semibold transition ${u.is_active ? 'text-red-600 bg-red-50 hover:bg-red-100' : 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'}`}>
                      {u.is_active ? 'Заблокировать' : 'Активировать'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {users.length === 0 && <div className="text-center py-12 text-slate-400 text-sm">Нет пользователей</div>}
      </div>
    </div>
  )
}
