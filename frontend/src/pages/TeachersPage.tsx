import { useEffect, useState } from 'react'
import api from '../api/client'

interface Subject { id: number; name: string }
interface City { id: number; name: string }
interface Teacher {
  id: number
  full_name: string
  is_active: boolean
  subject_ids: number[]
  subject_names: string[]
  user_id: number | null
}

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [cities, setCities] = useState<City[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState({
    full_name: '', is_active: true, subject_ids: [] as number[],
    username: '', password: '', city_id: '' as string,
  })

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    try {
      const [tR, sR, cR] = await Promise.all([api.get('/teachers/'), api.get('/subjects/'), api.get('/cities/')])
      setTeachers(tR.data.results || tR.data)
      setSubjects(sR.data.results || sR.data)
      setCities(cR.data.results || cR.data)
    } catch {}
    setLoading(false)
  }

  const resetForm = () => {
    setForm({ full_name: '', is_active: true, subject_ids: [], username: '', password: '', city_id: '' })
    setEditingId(null)
    setShowForm(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const payload: any = {
        full_name: form.full_name,
        is_active: form.is_active,
        subject_ids: form.subject_ids,
      }
      if (!editingId) {
        payload.username = form.username
        payload.password = form.password
        payload.city_id = form.city_id ? parseInt(form.city_id) : null
      }
      if (editingId) {
        await api.patch(`/teachers/${editingId}/`, payload)
      } else {
        await api.post('/teachers/', payload)
      }
      resetForm()
      fetchData()
    } catch (err: any) {
      alert(err.response?.data?.detail || JSON.stringify(err.response?.data) || 'Ошибка')
    }
  }

  const startEdit = (t: Teacher) => {
    setForm({
      full_name: t.full_name,
      is_active: t.is_active,
      subject_ids: t.subject_ids || [],
      username: '', password: '', city_id: '',
    })
    setEditingId(t.id)
    setShowForm(true)
  }

  const toggleSubject = (id: number) => {
    setForm((p) => ({
      ...p,
      subject_ids: p.subject_ids.includes(id) ? p.subject_ids.filter((s) => s !== id) : [...p.subject_ids, id],
    }))
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-500">Загрузка...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Педагоги</h1>
          <p className="text-sm text-slate-500 mt-0.5">Список педагогов и их предметы</p>
        </div>
        <button
          onClick={() => { if (showForm) resetForm(); else setShowForm(true) }}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/20 transition"
        >
          {showForm ? 'Отмена' : 'Добавить педагога'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            {editingId ? 'Редактирование' : 'Новый педагог (и аккаунт)'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ФИО</label>
                <input type="text" required className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
              </div>
              {!editingId && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Логин</label>
                    <input type="text" required className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Пароль</label>
                    <input type="text" required className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Город</label>
                    <select className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500" value={form.city_id} onChange={(e) => setForm({ ...form, city_id: e.target.value })}>
                      <option value="">Не выбран</option>
                      {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </>
              )}
            </div>
            <div>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                <span className="text-sm text-slate-700">Активен</span>
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Предметы</label>
              <div className="border border-slate-200 rounded-xl p-3 max-h-40 overflow-y-auto space-y-1.5">
                {subjects.length === 0 ? (
                  <p className="text-sm text-slate-400">Нет предметов</p>
                ) : subjects.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.subject_ids.includes(s.id)} onChange={() => toggleSubject(s.id)} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                    <span className="text-sm text-slate-800">{s.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <button type="submit" className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition">
              {editingId ? 'Сохранить' : 'Создать педагога и аккаунт'}
            </button>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <ul className="divide-y divide-slate-100">
          {teachers.map((t) => (
            <li key={t.id} className="px-5 py-4 hover:bg-slate-50 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-900">{t.full_name}</p>
                  {t.subject_names?.length > 0 && (
                    <p className="text-xs text-slate-500 mt-0.5">Предметы: {t.subject_names.join(', ')}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${t.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {t.is_active ? 'Активен' : 'Неактивен'}
                  </span>
                  <button onClick={() => startEdit(t)} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition">
                    Изменить
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
        {teachers.length === 0 && <div className="text-center py-12 text-slate-400">Нет педагогов</div>}
      </div>
    </div>
  )
}
