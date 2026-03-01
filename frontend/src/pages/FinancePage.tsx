import { useEffect, useState } from 'react'
import api from '../api/client'

interface UserItem {
  id: number
  username: string
  full_name: string
  role: string
  city_name: string | null
  balance: string
}

const ROLE_LABELS: Record<string, string> = {
  teacher: 'Педагог',
  administrator: 'Администратор',
  accountant: 'Бухгалтер',
  senior_admin: 'Ст. админ',
  chief_admin: 'Гл. админ',
  moderator: 'Модератор',
}

export default function FinancePage() {
  const [users, setUsers] = useState<UserItem[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<{ type: 'disburse' | 'extra'; userId: number; userName: string; balance: string } | null>(null)
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => { fetchUsers() }, [])

  const fetchUsers = async () => {
    try {
      const res = await api.get('/finance/users/')
      setUsers(res.data)
    } catch {}
    setLoading(false)
  }

  const handleSubmit = async () => {
    if (!modal || !amount || parseFloat(amount) <= 0) return
    try {
      const endpoint = modal.type === 'disburse' ? '/finance/disburse/' : '/finance/add-extra/'
      await api.post(endpoint, {
        user_id: modal.userId,
        amount: parseFloat(amount),
        description: description || (modal.type === 'disburse' ? 'Выдача средств' : 'Дополнительное начисление'),
      })
      setModal(null)
      setAmount('')
      setDescription('')
      fetchUsers()
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Ошибка')
    }
  }

  const fmt = (v: string) => parseFloat(v || '0').toLocaleString('ru-RU', { style: 'currency', currency: 'RUB' })

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-500">Загрузка...</div>

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Финансы</h1>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Пользователь</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Роль</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Город</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Баланс</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => {
                const bal = parseFloat(u.balance || '0')
                return (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4">
                      <p className="text-sm font-medium text-slate-900">{u.full_name}</p>
                      <p className="text-xs text-slate-500">@{u.username}</p>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600">{ROLE_LABELS[u.role] || u.role}</td>
                    <td className="px-5 py-4 text-sm text-slate-600">{u.city_name || '—'}</td>
                    <td className="px-5 py-4 text-right">
                      <span className={`text-sm font-semibold ${bal >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {fmt(u.balance)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => setModal({ type: 'disburse', userId: u.id, userName: u.full_name, balance: u.balance })}
                          disabled={bal <= 0}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 transition"
                        >
                          Выдать
                        </button>
                        <button
                          onClick={() => setModal({ type: 'extra', userId: u.id, userName: u.full_name, balance: u.balance })}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition"
                        >
                          Начислить
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {users.length === 0 && (
          <div className="text-center py-16 text-slate-400">Нет пользователей</div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-slate-900 mb-1">
              {modal.type === 'disburse' ? 'Выдать средства' : 'Начислить средства'}
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              {modal.userName} &middot; Баланс: {fmt(modal.balance)}
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Сумма</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Причина</label>
                <input
                  type="text"
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder={modal.type === 'disburse' ? 'Выдача средств' : 'Дополнительное начисление'}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                onClick={handleSubmit}
                disabled={!amount || parseFloat(amount) <= 0}
                className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition ${
                  modal.type === 'disburse' ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-emerald-600 hover:bg-emerald-500'
                }`}
              >
                {modal.type === 'disburse' ? 'Выдать' : 'Начислить'}
              </button>
              <button
                onClick={() => { setModal(null); setAmount(''); setDescription('') }}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
