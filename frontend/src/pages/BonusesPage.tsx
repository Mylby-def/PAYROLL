import { useEffect, useState } from 'react'
import api from '../api/client'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

interface Bonus {
  id: number
  teacher_name: string
  amount: string
  description: string
  period_start: string
  period_end: string
}

interface Teacher {
  id: number
  full_name: string
}

export default function BonusesPage() {
  const [bonuses, setBonuses] = useState<Bonus[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    teacher: '',
    amount: '',
    description: '',
    period_start: new Date().toISOString().split('T')[0],
    period_end: new Date().toISOString().split('T')[0],
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [bonusesRes, teachersRes] = await Promise.all([
        api.get('/bonuses/'),
        api.get('/teachers/'),
      ])
      setBonuses(bonusesRes.data.results || bonusesRes.data)
      setTeachers(teachersRes.data.results || teachersRes.data)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/bonuses/', formData)
      setShowForm(false)
      setFormData({
        teacher: '',
        amount: '',
        description: '',
        period_start: new Date().toISOString().split('T')[0],
        period_end: new Date().toISOString().split('T')[0],
      })
      fetchData()
    } catch (error) {
      console.error('Error creating bonus:', error)
    }
  }

  if (loading) {
    return <div className="text-center py-12">Загрузка...</div>
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Премиальные</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
        >
          {showForm ? 'Отмена' : 'Добавить премиальные'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-medium mb-4">Новые премиальные</h2>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Преподаватель
                </label>
                <select
                  required
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  value={formData.teacher}
                  onChange={(e) =>
                    setFormData({ ...formData, teacher: e.target.value })
                  }
                >
                  <option value="">Выберите...</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.full_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Сумма
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Период с
                </label>
                <input
                  type="date"
                  required
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  value={formData.period_start}
                  onChange={(e) =>
                    setFormData({ ...formData, period_start: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Период по
                </label>
                <input
                  type="date"
                  required
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  value={formData.period_end}
                  onChange={(e) =>
                    setFormData({ ...formData, period_end: e.target.value })
                  }
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Описание
                </label>
                <textarea
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  rows={3}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </div>
            </div>
            <button
              type="submit"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Создать
            </button>
          </form>
        </div>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Преподаватель
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Сумма
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Период
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Описание
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {bonuses.map((bonus) => (
                <tr key={bonus.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {bonus.teacher_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {parseFloat(bonus.amount).toLocaleString('ru-RU', {
                      style: 'currency',
                      currency: 'RUB',
                    })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(new Date(bonus.period_start), 'd MMM yyyy', {
                      locale: ru,
                    })}{' '}
                    -{' '}
                    {format(new Date(bonus.period_end), 'd MMM yyyy', {
                      locale: ru,
                    })}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {bonus.description || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {bonuses.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            Нет премиальных. Добавьте первые!
          </div>
        )}
      </div>
    </div>
  )
}
