import { useEffect, useState } from 'react'
import { useAuthStore } from '../store/authStore'
import api from '../api/client'

interface UserItem { id: number; username: string; full_name: string; role: string; city_name: string | null; city_id: number | null; branch_id: number | null; branch_name: string | null; is_active: boolean }
interface City { id: number; name: string }
interface Branch { id: number; name: string; city: number; city_name: string }

const ROLE_L: Record<string, string> = {
  administrator: 'Администратор', accountant: 'Бухгалтер', senior_admin: 'Ст. администратор',
  chief_admin: 'Гл. администратор', moderator: 'Модератор',
}
const ADMIN_ROLES = ['administrator', 'accountant', 'senior_admin', 'chief_admin', 'moderator']

export default function AdminsPage() {
  const { user } = useAuthStore()
  const [users, setUsers] = useState<UserItem[]>([])
  const [cities, setCities] = useState<City[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [editId, setEditId] = useState<number | null>(null)
  const [editData, setEditData] = useState({ role: '', city_id: '', branch_id: '' })

  const myRole = user?.role || ''

  useEffect(() => {
    Promise.all([api.get('/profiles/'), api.get('/cities/'), api.get('/branches/')])
      .then(([uR, cR, bR]) => {
        const all = uR.data as UserItem[]
        setUsers(all.filter(u => ADMIN_ROLES.includes(u.role || '')))
        setCities(cR.data.results || cR.data)
        setBranches(bR.data.results || bR.data)
      }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const refresh = () => api.get('/profiles/').then(r => setUsers((r.data as UserItem[]).filter(u => ADMIN_ROLES.includes(u.role || '')))).catch(() => {})

  const startEdit = (u: UserItem) => {
    setEditId(u.id)
    setEditData({ role: u.role || '', city_id: String(u.city_id || ''), branch_id: String(u.branch_id || '') })
  }

  const saveEdit = async () => {
    if (!editId) return
    try {
      await api.patch(`/profiles/${editId}/`, {
        role: editData.role || undefined,
        city_id: editData.city_id ? parseInt(editData.city_id) : null,
        branch_id: editData.branch_id ? parseInt(editData.branch_id) : null,
      })
      setEditId(null)
      refresh()
    } catch (e: any) { alert(e.response?.data?.detail || 'Ошибка') }
  }

  const visibleRoles = myRole === 'senior_admin' ? ['administrator'] : ADMIN_ROLES
  const filteredUsers = users.filter(u => {
    if (myRole === 'senior_admin') return u.role === 'administrator'
    if (myRole === 'chief_admin') return ['administrator', 'accountant', 'senior_admin'].includes(u.role || '')
    return true
  })

  const cityBranches = editData.city_id ? branches.filter(b => b.city === parseInt(editData.city_id)) : branches

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400 text-sm">Загрузка...</div>

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-900 mb-5">Администраторы</h1>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead><tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase">Имя</th>
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase">Роль</th>
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase">Город</th>
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase">Филиал</th>
              <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-slate-500 uppercase">Действия</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map(u => (
                <tr key={u.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-slate-900">{u.full_name}</p>
                    <p className="text-[10px] text-slate-400">@{u.username}</p>
                  </td>
                  <td className="px-4 py-3">
                    {editId === u.id ? (
                      <select className="rounded-lg border border-slate-300 px-2 py-1 text-xs" value={editData.role} onChange={e => setEditData({ ...editData, role: e.target.value })}>
                        {visibleRoles.map(r => <option key={r} value={r}>{ROLE_L[r]}</option>)}
                      </select>
                    ) : (
                      <span className="text-xs text-slate-600">{ROLE_L[u.role] || u.role}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editId === u.id ? (
                      <select className="rounded-lg border border-slate-300 px-2 py-1 text-xs" value={editData.city_id} onChange={e => setEditData({ ...editData, city_id: e.target.value, branch_id: '' })}>
                        <option value="">—</option>
                        {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    ) : (
                      <span className="text-xs text-slate-600">{u.city_name || '—'}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editId === u.id ? (
                      <select className="rounded-lg border border-slate-300 px-2 py-1 text-xs" value={editData.branch_id} onChange={e => setEditData({ ...editData, branch_id: e.target.value })}>
                        <option value="">—</option>
                        {cityBranches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    ) : (
                      <span className="text-xs text-slate-600">{u.branch_name || '—'}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {editId === u.id ? (
                      <div className="flex gap-1 justify-end">
                        <button onClick={saveEdit} className="px-2.5 py-1 rounded-lg text-[10px] font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition">Сохранить</button>
                        <button onClick={() => setEditId(null)} className="px-2.5 py-1 rounded-lg text-[10px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition">Отмена</button>
                      </div>
                    ) : (
                      <button onClick={() => startEdit(u)} className="px-2.5 py-1 rounded-lg text-[10px] font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition">Настроить</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredUsers.length === 0 && <div className="text-center py-12 text-slate-400 text-sm">Нет администраторов</div>}
      </div>
    </div>
  )
}
