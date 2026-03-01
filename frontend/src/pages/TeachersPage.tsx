import { useEffect, useState } from 'react'
import api from '../api/client'

interface Subject {
  id: number
  name: string
}

interface Teacher {
  id: number
  full_name: string
  is_active: boolean
  subject_ids: number[]
  subject_names: string[]
}

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ full_name: '', is_active: true, subject_ids: [] as number[] })
  const [editingId, setEditingId] = useState<number | null>(null)

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    try {
      const [tRes, sRes] = await Promise.all([
        api.get('/teachers/'),
        api.get('/subjects/'),
      ])
      setTeachers(tRes.data.results || tRes.data)
      setSubjects(sRes.data.results || sRes.data)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingId) {
        await api.patch(`/teachers/${editingId}/`, formData)
      } else {
        await api.post('/teachers/', formData)
      }
      setShowForm(false)
      setEditingId(null)
      setFormData({ full_name: '', is_active: true, subject_ids: [] })
      fetchData()
    } catch (error) {
      console.error('Error saving teacher:', error)
    }
  }

  const startEdit = (teacher: Teacher) => {
    setFormData({
      full_name: teacher.full_name,
      is_active: teacher.is_active,
      subject_ids: teacher.subject_ids || [],
    })
    setEditingId(teacher.id)
    setShowForm(true)
  }

  const toggleSubject = (id: number) => {
    setFormData((prev) => ({
      ...prev,
      subject_ids: prev.subject_ids.includes(id)
        ? prev.subject_ids.filter((s) => s !== id)
        : [...prev.subject_ids, id],
    }))
  }

  if (loading) return <div className="text-center py-12">Загрузка...</div>

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Преподаватели</h1>
        <button
          onClick={() => {
            setShowForm(!showForm)
            if (showForm) { setEditingId(null); setFormData({ full_name: '', is_active: true, subject_ids: [] }) }
          }}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
        >
          {showForm ? 'Отмена' : 'Добавить преподавателя'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-medium mb-4">
            {editingId ? 'Редактирование преподавателя' : 'Новый преподаватель'}
          </h2>
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">ФИО</label>
              <input
                type="text"
                required
                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              />
            </div>
            <div className="mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">Активен</span>
              </label>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Предметы</label>
              <div className="border border-gray-200 rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
                {subjects.length === 0 ? (
                  <p className="text-sm text-gray-500">Нет предметов в системе</p>
                ) : (
                  subjects.map((s) => (
                    <label key={s.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.subject_ids.includes(s.id)}
                        onChange={() => toggleSubject(s.id)}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-gray-900">{s.name}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
            <button
              type="submit"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
            >
              {editingId ? 'Сохранить' : 'Создать'}
            </button>
          </form>
        </div>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {teachers.map((teacher) => (
            <li key={teacher.id} className="px-4 py-4 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900">{teacher.full_name}</p>
                  {teacher.subject_names && teacher.subject_names.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      Предметы: {teacher.subject_names.join(', ')}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      teacher.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {teacher.is_active ? 'Активен' : 'Неактивен'}
                  </span>
                  <button
                    onClick={() => startEdit(teacher)}
                    className="text-indigo-600 hover:text-indigo-800 text-sm"
                  >
                    Редактировать
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
        {teachers.length === 0 && (
          <div className="text-center py-12 text-gray-500">Нет преподавателей. Добавьте первого!</div>
        )}
      </div>
    </div>
  )
}
