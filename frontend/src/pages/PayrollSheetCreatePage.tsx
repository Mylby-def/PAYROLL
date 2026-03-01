import { useState, FormEvent, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../api/client'

interface Teacher {
  id: number
  full_name: string
  subject_ids: number[]
  subject_names: string[]
}

interface Subject {
  id: number
  name: string
}

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

export default function PayrollSheetCreatePage() {
  const navigate = useNavigate()
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [teacherId, setTeacherId] = useState('')
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<number[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    Promise.all([api.get('/teachers/'), api.get('/subjects/')])
      .then(([tRes, sRes]) => {
        setTeachers(tRes.data.results || tRes.data)
        setSubjects(sRes.data.results || sRes.data)
      })
      .catch(() => {})
  }, [])

  const handleTeacherChange = (id: string) => {
    setTeacherId(id)
    const teacher = id ? teachers.find((t) => t.id === Number(id)) : null
    setSelectedSubjectIds(teacher?.subject_ids || [])
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const response = await api.post('/payroll-sheets/', {
        teacher: teacherId ? Number(teacherId) : null,
        period_start: periodStart,
        period_end: periodEnd,
        subjects: selectedSubjectIds,
      })
      navigate(`/payroll-sheets/${response.data.id}`)
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: Record<string, unknown> } }).response?.data
          : null
      const detail =
        msg && typeof msg === 'object' && 'detail' in msg
          ? String((msg as { detail: unknown }).detail)
          : ''
      setError(detail || 'Не удалось создать расчётный лист')
    } finally {
      setLoading(false)
    }
  }

  const toggleSubject = (id: number) => {
    setSelectedSubjectIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    )
  }

  const selectedTeacher = teachers.find((t) => t.id === Number(teacherId))

  return (
    <div className="px-4 py-6 sm:px-0">
      <Link
        to="/payroll-sheets"
        className="text-indigo-600 hover:text-indigo-900 mb-4 inline-block"
      >
        &larr; Назад к списку
      </Link>
      <div className="max-w-lg">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Новый расчётный лист</h1>
        <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Педагог (ФИО)</label>
            <select
              required
              className="block w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              value={teacherId}
              onChange={(e) => handleTeacherChange(e.target.value)}
            >
              <option value="">Выберите педагога...</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.full_name}
                </option>
              ))}
            </select>
          </div>

          {selectedTeacher && (
            <div className="bg-gray-50 border border-gray-200 rounded-md px-4 py-3 text-sm">
              <p className="font-medium text-gray-700">Сотрудник: {selectedTeacher.full_name}</p>
              {selectedTeacher.subject_names && selectedTeacher.subject_names.length > 0 && (
                <p className="text-gray-500 mt-1">
                  Предметы из профиля: {selectedTeacher.subject_names.join(', ')}
                </p>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Период с</label>
            <div className="flex gap-2 items-center">
              <input
                type="date"
                required
                className="block flex-1 rounded-md border border-gray-300 shadow-sm px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setPeriodStart(todayStr())}
                className="px-3 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 border border-indigo-200 rounded-md hover:bg-indigo-50"
              >
                Сегодня
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Период по</label>
            <div className="flex gap-2 items-center">
              <input
                type="date"
                required
                className="block flex-1 rounded-md border border-gray-300 shadow-sm px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setPeriodEnd(todayStr())}
                className="px-3 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 border border-indigo-200 rounded-md hover:bg-indigo-50"
              >
                Сегодня
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Предметы
            </label>
            <div className="border border-gray-200 rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
              {subjects.length === 0 ? (
                <p className="text-sm text-gray-500">Нет предметов в системе</p>
              ) : (
                subjects.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedSubjectIds.includes(s.id)}
                      onChange={() => toggleSubject(s.id)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-900">{s.name}</span>
                  </label>
                ))
              )}
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Создание...' : 'Создать'}
            </button>
            <Link
              to="/payroll-sheets"
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
            >
              Отмена
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
