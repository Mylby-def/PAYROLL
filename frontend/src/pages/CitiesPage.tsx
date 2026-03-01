import { useEffect, useState } from 'react'
import api from '../api/client'

interface City { id: number; name: string }

export default function CitiesPage() {
  const [cities, setCities] = useState<City[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')

  useEffect(() => { fetchCities() }, [])

  const fetchCities = async () => {
    try {
      const res = await api.get('/cities/')
      setCities(res.data.results || res.data)
    } catch {}
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/cities/', { name })
      setShowForm(false)
      setName('')
      fetchCities()
    } catch {}
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить город?')) return
    try {
      await api.delete(`/cities/${id}/`)
      fetchCities()
    } catch {}
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-500">Загрузка...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Города</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm transition"
        >
          {showForm ? 'Отмена' : 'Добавить город'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-6 flex gap-3">
          <input
            type="text"
            required
            placeholder="Название города"
            className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button type="submit" className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition">
            Создать
          </button>
        </form>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <ul className="divide-y divide-slate-100">
          {cities.map((c) => (
            <li key={c.id} className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors">
              <span className="text-sm font-medium text-slate-900">{c.name}</span>
              <button onClick={() => handleDelete(c.id)} className="text-xs text-red-600 hover:text-red-800 transition">
                Удалить
              </button>
            </li>
          ))}
        </ul>
        {cities.length === 0 && <div className="text-center py-12 text-slate-400">Нет городов</div>}
      </div>
    </div>
  )
}
