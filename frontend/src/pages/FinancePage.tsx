import { useEffect, useState } from 'react'
import api from '../api/client'

interface UserItem {
  id: number; username: string; full_name: string; role: string
  city_name: string | null; balance: string; balance_premium: string; balance_vacation: string
}

const ROLE_L: Record<string, string> = {
  teacher: 'Педагог', administrator: 'Админ', accountant: 'Бухгалтер',
  senior_admin: 'Ст. админ', chief_admin: 'Гл. админ', moderator: 'Модератор',
}

type BalType = 'main' | 'premium' | 'vacation'
const BAL_LABELS: Record<BalType, string> = { main: 'Основной', premium: 'Премиальные', vacation: 'Отпускные' }

export default function FinancePage() {
  const [users, setUsers] = useState<UserItem[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<{ type: 'disburse' | 'extra'; userId: number; userName: string; balType: BalType; max: number } | null>(null)
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => { fetch() }, [])

  const fetch = async () => {
    try { const r = await api.get('/finance/users/'); setUsers(r.data) } catch {}
    setLoading(false)
  }

  const submit = async () => {
    if (!modal || !amount || parseFloat(amount) <= 0) return
    try {
      const ep = modal.type === 'disburse' ? '/finance/disburse/' : '/finance/add-extra/'
      await api.post(ep, {
        user_id: modal.userId, amount: parseFloat(amount), balance_type: modal.balType,
        description: description || (modal.type === 'disburse' ? 'Выдача средств' : 'Дополнительное начисление'),
      })
      setModal(null); setAmount(''); setDescription(''); fetch()
    } catch (e: any) { alert(e.response?.data?.detail || 'Ошибка') }
  }

  const fmt = (v: string) => parseFloat(v || '0').toLocaleString('ru-RU', { style: 'currency', currency: 'RUB' })
  const p = (v: string) => parseFloat(v || '0')

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400 text-sm">Загрузка...</div>

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Финансы</h1>
        <p className="text-sm text-slate-500 mt-0.5">Балансы и операции по пользователям</p>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase">Пользователь</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase hidden sm:table-cell">Роль</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-slate-500 uppercase">Основной</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-slate-500 uppercase">Премия</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-slate-500 uppercase">Отпуск</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-slate-500 uppercase">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-slate-900">{u.full_name}</p>
                    <p className="text-[11px] text-slate-400">@{u.username}{u.city_name ? ` · ${u.city_name}` : ''}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 hidden sm:table-cell">{ROLE_L[u.role] || u.role}</td>
                  <td className="px-4 py-3 text-right"><span className={`text-sm font-semibold ${p(u.balance) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmt(u.balance)}</span></td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-amber-600">{fmt(u.balance_premium)}</td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-sky-600">{fmt(u.balance_vacation)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-1 justify-end flex-wrap">
                      {(['main', 'premium', 'vacation'] as BalType[]).map((bt) => {
                        const bVal = bt === 'main' ? p(u.balance) : bt === 'premium' ? p(u.balance_premium) : p(u.balance_vacation)
                        return (
                          <div key={bt} className="flex gap-0.5">
                            <button onClick={() => setModal({ type: 'disburse', userId: u.id, userName: u.full_name, balType: bt, max: bVal })} disabled={bVal <= 0}
                              className="px-2 py-1 rounded text-[10px] font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 transition" title={`Выдать ${BAL_LABELS[bt]}`}>
                              ↓{bt === 'main' ? 'О' : bt === 'premium' ? 'П' : 'В'}
                            </button>
                            <button onClick={() => setModal({ type: 'extra', userId: u.id, userName: u.full_name, balType: bt, max: 0 })}
                              className="px-2 py-1 rounded text-[10px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition" title={`Начислить ${BAL_LABELS[bt]}`}>
                              ↑{bt === 'main' ? 'О' : bt === 'premium' ? 'П' : 'В'}
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {users.length === 0 && <div className="text-center py-12 text-slate-400 text-sm">Нет пользователей</div>}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <h3 className="text-base font-semibold text-slate-900 mb-1">
              {modal.type === 'disburse' ? 'Выдать' : 'Начислить'} — {BAL_LABELS[modal.balType]}
            </h3>
            <p className="text-sm text-slate-500 mb-4">{modal.userName}</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Сумма</label>
                <input type="number" step="0.01" min="0.01" className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                  value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Причина</label>
                <input type="text" className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                  value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={submit} disabled={!amount || parseFloat(amount) <= 0}
                className={`flex-1 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition ${modal.type === 'disburse' ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-emerald-600 hover:bg-emerald-500'}`}>
                {modal.type === 'disburse' ? 'Выдать' : 'Начислить'}
              </button>
              <button onClick={() => { setModal(null); setAmount(''); setDescription('') }}
                className="flex-1 px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition">Отмена</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
