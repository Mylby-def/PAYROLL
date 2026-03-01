import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { useAuthStore } from '../store/authStore'
import api from '../api/client'

interface Tx {
  id: number; user: number; user_name: string; user_city: string | null
  transaction_type: string; balance_type: string; amount: string
  description: string; created_by_name: string | null; created_at: string
}

const TYPE_L: Record<string, string> = {
  payroll_credit: 'Ведомость', premium_credit: 'Премиальные', vacation_credit: 'Отпускные',
  disbursement: 'Выдача', premium_disbursement: 'Выдача премии', vacation_disbursement: 'Выдача отпускных',
  extra_credit: 'Доп. начисление', extra_premium: 'Доп. премия', extra_vacation: 'Доп. отпускные',
  advance_given: 'Аванс', advance_repaid: 'Погашение аванса',
  expense: 'Расход', income: 'Доход',
}
const BAL_L: Record<string, string> = { main: 'Основной', premium: 'Премия', vacation: 'Отпуск' }
const BAL_C: Record<string, string> = { main: 'bg-indigo-100 text-indigo-700', premium: 'bg-amber-100 text-amber-700', vacation: 'bg-sky-100 text-sky-700' }

export default function TransactionsPage() {
  const { user } = useAuthStore()
  const [txs, setTxs] = useState<Tx[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ user_id: '', transaction_type: 'income', balance_type: 'main', amount: '', description: '' })
  const [users, setUsers] = useState<{ id: number; username: string; full_name: string }[]>([])

  const role = user?.role || 'teacher'
  const canCreate = ['senior_admin', 'chief_admin', 'moderator'].includes(role)

  useEffect(() => {
    api.get('/transactions/').then((r) => setTxs(r.data.results || r.data)).catch(() => {}).finally(() => setLoading(false))
    if (canCreate) api.get('/finance/users/').then((r) => setUsers(r.data)).catch(() => {})
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/transactions/', {
        user: parseInt(form.user_id), transaction_type: form.transaction_type,
        balance_type: form.balance_type,
        amount: form.transaction_type === 'expense' ? -Math.abs(parseFloat(form.amount)) : Math.abs(parseFloat(form.amount)),
        description: form.description,
      })
      setShowForm(false); setForm({ user_id: '', transaction_type: 'income', balance_type: 'main', amount: '', description: '' })
      const r = await api.get('/transactions/'); setTxs(r.data.results || r.data)
    } catch (e: any) { alert(e.response?.data?.detail || 'Ошибка') }
  }

  const fmt = (v: string) => {
    const n = parseFloat(v || '0')
    return (n >= 0 ? '+' : '') + n.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB' })
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400 text-sm">Загрузка...</div>

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Транзакции</h1>
          <p className="text-sm text-slate-500 mt-0.5">История движений по счетам</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { window.location.href = '/api/finance/export-transactions/' }}
            className="px-3 py-1.5 rounded-xl text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition">
            Экспорт Excel
          </button>
          {canCreate && (
            <button onClick={() => setShowForm(!showForm)}
              className="px-3 py-1.5 rounded-xl text-[11px] font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm transition">
              {showForm ? 'Отмена' : 'Добавить'}
            </button>
          )}
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Пользователь</label>
              <select required className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" value={form.user_id} onChange={(e) => setForm({ ...form, user_id: e.target.value })}>
                <option value="">Выберите...</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.full_name} (@{u.username})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Тип</label>
              <select className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" value={form.transaction_type} onChange={(e) => setForm({ ...form, transaction_type: e.target.value })}>
                <option value="income">Доход (+)</option>
                <option value="expense">Расход (−)</option>
                <option value="extra_credit">Доп. начисление (+)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Счёт</label>
              <select className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" value={form.balance_type} onChange={(e) => setForm({ ...form, balance_type: e.target.value })}>
                <option value="main">Основной</option>
                <option value="premium">Премиальные</option>
                <option value="vacation">Отпускные</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Сумма</label>
              <input type="number" step="0.01" min="0.01" required className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Описание</label>
              <input type="text" className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="Причина..."
                value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>
          <button type="submit" className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition">Создать</button>
        </form>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase">Дата</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase">Пользователь</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase">Тип</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase">Счёт</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-slate-500 uppercase">Сумма</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase hidden sm:table-cell">Описание</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {txs.map((tx) => {
                const amt = parseFloat(tx.amount || '0')
                return (
                  <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{format(new Date(tx.created_at), 'd MMM yy HH:mm', { locale: ru })}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-slate-900">{tx.user_name}</p>
                      {tx.user_city && <p className="text-[10px] text-slate-400">{tx.user_city}</p>}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{TYPE_L[tx.transaction_type] || tx.transaction_type}</td>
                    <td className="px-4 py-3"><span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${BAL_C[tx.balance_type] || 'bg-slate-100 text-slate-600'}`}>{BAL_L[tx.balance_type] || tx.balance_type}</span></td>
                    <td className="px-4 py-3 text-right"><span className={`text-sm font-semibold ${amt >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmt(tx.amount)}</span></td>
                    <td className="px-4 py-3 text-xs text-slate-500 hidden sm:table-cell max-w-[200px] truncate">{tx.description || '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {txs.length === 0 && <div className="text-center py-12 text-slate-400 text-sm">Нет транзакций</div>}
      </div>
    </div>
  )
}
