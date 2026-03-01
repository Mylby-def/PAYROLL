import { useState } from 'react'
import { useAuthStore } from '../store/authStore'
import api from '../api/client'

export default function SettingsPage() {
  const { user } = useAuthStore()
  const [oldPw, setOldPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  const handleChangePw = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg(''); setErr('')
    try {
      await api.post('/auth/change-password/', { old_password: oldPw, new_password: newPw })
      setMsg('Пароль успешно изменён')
      setOldPw(''); setNewPw('')
    } catch (e: any) { setErr(e.response?.data?.detail || 'Ошибка') }
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-bold text-slate-900 mb-5">Настройки</h1>

      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-3">Смена пароля</h2>
        <form onSubmit={handleChangePw} className="space-y-3">
          {msg && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-2 rounded-lg text-sm">{msg}</div>}
          {err && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{err}</div>}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Текущий пароль</label>
            <input type="password" required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent" value={oldPw} onChange={e => setOldPw(e.target.value)} />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Новый пароль</label>
            <input type="password" required minLength={4} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent" value={newPw} onChange={e => setNewPw(e.target.value)} />
          </div>
          <button type="submit" className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition">Изменить пароль</button>
        </form>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-2">Информация</h2>
        <div className="text-sm text-slate-600 space-y-1">
          <p>Логин: <span className="font-medium text-slate-900">{user?.username}</span></p>
          <p>Имя: <span className="font-medium text-slate-900">{user?.first_name || '—'}</span></p>
          <p>Город: <span className="font-medium text-slate-900">{user?.city || '—'}</span></p>
        </div>
      </div>
    </div>
  )
}
