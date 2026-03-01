import { useEffect, useState } from 'react'
import api from '../api/client'

interface Branch { id: number; name: string; city: number; city_name: string; balance: string }
interface City { id: number; name: string }

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [cities, setCities] = useState<City[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', city: '' })
  const [modal, setModal] = useState<{ type: 'deposit' | 'withdraw'; branch: Branch } | null>(null)
  const [amount, setAmount] = useState('')
  const [desc, setDesc] = useState('')

  useEffect(() => {
    Promise.all([api.get('/branches/'), api.get('/cities/')])
      .then(([bR, cR]) => { setBranches(bR.data.results || bR.data); setCities(cR.data.results || cR.data) })
      .catch(() => {}).finally(() => setLoading(false))
  }, [])

  const refresh = () => api.get('/branches/').then(r => setBranches(r.data.results || r.data)).catch(() => {})

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try { await api.post('/branches/', { name: form.name, city: parseInt(form.city) }); setShowForm(false); setForm({ name: '', city: '' }); refresh() }
    catch (e: any) { alert(e.response?.data?.detail || 'Ошибка') }
  }

  const handleFinance = async () => {
    if (!modal || !amount || parseFloat(amount) <= 0) return
    try {
      await api.post(`/branches/${modal.branch.id}/${modal.type === 'deposit' ? 'deposit' : 'withdraw'}/`, { amount: parseFloat(amount), description: desc })
      setModal(null); setAmount(''); setDesc(''); refresh()
    } catch (e: any) { alert(e.response?.data?.detail || 'Ошибка') }
  }

  const fmt = (v: string) => parseFloat(v || '0').toLocaleString('ru-RU', { style: 'currency', currency: 'RUB' })

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400 text-sm">Загрузка...</div>

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Филиалы</h1>
          <p className="text-sm text-slate-500 mt-0.5">Счета и балансы филиалов</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/20 transition">
          {showForm ? 'Отмена' : 'Создать филиал'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-6 flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[160px]">
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Название</label>
            <input type="text" required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Город</label>
            <select required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })}>
              <option value="">Выберите...</option>
              {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <button type="submit" className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition">Создать</button>
        </form>
      )}

      <div className="grid gap-3">
        {branches.map(br => (
          <div key={br.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center justify-between hover:shadow-lg hover:border-indigo-100 transition-all">
            <div>
              <p className="text-sm font-semibold text-slate-900">{br.name}</p>
              <p className="text-[11px] text-slate-400">{br.city_name}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-sm font-bold ${parseFloat(br.balance) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmt(br.balance)}</span>
              <div className="flex gap-1">
                <button onClick={() => setModal({ type: 'deposit', branch: br })} className="px-2.5 py-1 rounded-lg text-[10px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition">Внести</button>
                <button onClick={() => setModal({ type: 'withdraw', branch: br })} disabled={parseFloat(br.balance) <= 0}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-30 transition">Снять</button>
              </div>
            </div>
          </div>
        ))}
        {branches.length === 0 && <div className="text-center py-12 text-slate-400 text-sm">Нет филиалов</div>}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-5 max-w-sm w-full">
            <h3 className="text-base font-semibold text-slate-900 mb-1">{modal.type === 'deposit' ? 'Внести на счёт' : 'Снять со счёта'}</h3>
            <p className="text-sm text-slate-500 mb-4">{modal.branch.name} · Баланс: {fmt(modal.branch.balance)}</p>
            <div className="space-y-3 mb-4">
              <input type="number" step="0.01" min="0.01" placeholder="Сумма" className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" value={amount} onChange={e => setAmount(e.target.value)} autoFocus />
              <input type="text" placeholder="Описание" className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" value={desc} onChange={e => setDesc(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <button onClick={handleFinance} disabled={!amount || parseFloat(amount) <= 0}
                className={`flex-1 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition ${modal.type === 'deposit' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-indigo-600 hover:bg-indigo-500'}`}>
                {modal.type === 'deposit' ? 'Внести' : 'Снять'}
              </button>
              <button onClick={() => { setModal(null); setAmount(''); setDesc('') }} className="flex-1 px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition">Отмена</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
