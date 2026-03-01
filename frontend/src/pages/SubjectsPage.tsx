import { useEffect, useState } from 'react'
import api from '../api/client'

interface Subject {
  id: number
  name: string
}

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ name: '' })

  useEffect(() => {
    fetchSubjects()
  }, [])

  const fetchSubjects = async () => {
    try {
      const response = await api.get('/subjects/')
      setSubjects(response.data.results || response.data)
    } catch (error) {
      console.error('Error fetching subjects:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/subjects/', formData)
      setShowForm(false)
      setFormData({ name: '' })
      fetchSubjects()
    } catch (error) {
      console.error('Error creating subject:', error)
    }
  }

  if (loading) {
    return <div className="text-center py-12">Загрузка...</div>
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Предметы</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
        >
          {showForm ? 'Отмена' : 'Добавить предмет'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-medium mb-4">Новый предмет</h2>
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Название
              </label>
              <input
                type="text"
                required
                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
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
        <ul className="divide-y divide-gray-200">
          {subjects.map((subject) => (
            <li key={subject.id} className="px-4 py-4 sm:px-6">
              <p className="text-sm font-medium text-gray-900">{subject.name}</p>
            </li>
          ))}
        </ul>
        {subjects.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            Нет предметов. Добавьте первый!
          </div>
        )}
      </div>
    </div>
  )
}
