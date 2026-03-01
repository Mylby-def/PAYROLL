import { useEffect, useState } from 'react'
import api from '../api/client'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

interface Rate {
  id: number
  rate_kind: string
  rate_type: string | null
  subject_name: string
  amount: string
  effective_from: string
  effective_to: string | null
}

interface Subject {
  id: number
  name: string
}

const RATE_KIND_LABELS: Record<string, string> = {
  payment: 'Оплата',
  bonus: 'Премиальные',
  vacation: 'Отпускные',
}

export default function RatesPage() {
  const [rates, setRates] = useState<Rate[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    rate_kind: 'payment' as string,
    rate_type: 'hour' as string,
    subject: '',
    amount: '',
    effective_from: new Date().toISOString().split('T')[0],
    effective_to: '',
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [ratesRes, subjectsRes] = await Promise.all([
        api.get('/rates/'),
        api.get('/subjects/'),
      ])
      setRates(ratesRes.data.results || ratesRes.data)
      setSubjects(subjectsRes.data.results || subjectsRes.data)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const payload = {
        rate_kind: formData.rate_kind,
        rate_type: formData.rate_kind === 'payment' ? formData.rate_type : null,
        subject: formData.subject,
        amount: formData.amount,
        effective_from: formData.effective_from,
        effective_to: formData.effective_to || null,
      }
      await api.post('/rates/', payload)
      setShowForm(false)
      setFormData({
        rate_kind: 'payment',
        rate_type: 'hour',
        subject: '',
        amount: '',
        effective_from: new Date().toISOString().split('T')[0],
        effective_to: '',
      })
      fetchData()
    } catch (error) {
      console.error('Error creating rate:', error)
    }
  }

  if (loading) {
    return <div className="text-center py-12">Загрузка...</div>
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Тарифы</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
        >
          {showForm ? 'Отмена' : 'Добавить тариф'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-medium mb-4">Новый тариф</h2>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Вид</label>
                <select
                  required
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  value={formData.rate_kind}
                  onChange={(e) =>
                    setFormData({ ...formData, rate_kind: e.target.value })
                  }
                >
                  <option value="payment">Оплата</option>
                  <option value="bonus">Премиальные</option>
                  <option value="vacation">Отпускные</option>
                </select>
              </div>
              {formData.rate_kind === 'payment' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Тип (для Оплаты)
                  </label>
                  <select
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    value={formData.rate_type}
                    onChange={(e) =>
                      setFormData({ ...formData, rate_type: e.target.value })
                    }
                  >
                    <option value="hour">За час</option>
                    <option value="group">За группу</option>
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Предмет</label>
                <select
                  required
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  value={formData.subject}
                  onChange={(e) =>
                    setFormData({ ...formData, subject: e.target.value })
                  }
                >
                  <option value="">Выберите...</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Сумма</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Действует с</label>
                <input
                  type="date"
                  required
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  value={formData.effective_from}
                  onChange={(e) =>
                    setFormData({ ...formData, effective_from: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Действует до (необязательно)
                </label>
                <input
                  type="date"
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  value={formData.effective_to}
                  onChange={(e) =>
                    setFormData({ ...formData, effective_to: e.target.value })
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
                  Вид
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Предмет
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Тип
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Сумма
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Период
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rates.map((rate) => (
                <tr key={rate.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {RATE_KIND_LABELS[rate.rate_kind] || rate.rate_kind}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {rate.subject_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {rate.rate_type === 'hour'
                      ? 'За час'
                      : rate.rate_type === 'group'
                        ? 'За группу'
                        : '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {parseFloat(rate.amount).toLocaleString('ru-RU', {
                      style: 'currency',
                      currency: 'RUB',
                    })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(new Date(rate.effective_from), 'd MMM yyyy', {
                      locale: ru,
                    })}
                    {rate.effective_to &&
                      ` - ${format(new Date(rate.effective_to), 'd MMM yyyy', {
                        locale: ru,
                      })}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rates.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            Нет тарифов. Добавьте первый!
          </div>
        )}
      </div>
    </div>
  )
}
