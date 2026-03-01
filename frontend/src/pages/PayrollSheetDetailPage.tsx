import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import api from '../api/client'

interface Teacher {
  id: number
  full_name: string
}

interface Subject {
  id: number
  name: string
}

interface PayrollEntry {
  id: number
  teacher_name: string
  subject_name: string
  date: string
  hours: string
  rate_per_hour: string | null
  rate_per_group: string | null
  amount: string
  notes: string
}

interface PayrollSheet {
  id: number
  title: string
  teacher?: number
  teacher_name?: string
  period_start: string
  period_end: string
  status: string
  entries: PayrollEntry[]
  total_amount: string
  notes: string
  subject_ids?: number[]
}

const emptyEntryForm = {
  teacher: '',
  subject: '',
  date: new Date().toISOString().split('T')[0],
  hours: '',
  rate_per_hour: '',
  rate_per_group: '',
  amount: '',
  notes: '',
}

export default function PayrollSheetDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [sheet, setSheet] = useState<PayrollSheet | null>(null)
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [entryForm, setEntryForm] = useState(emptyEntryForm)
  const [entrySaving, setEntrySaving] = useState(false)
  const [entryError, setEntryError] = useState('')

  useEffect(() => {
    if (id && id !== 'new') {
      fetchSheet()
    }
  }, [id])

  useEffect(() => {
    Promise.all([api.get('/teachers/'), api.get('/subjects/')])
      .then(([tRes, sRes]) => {
        setTeachers(tRes.data.results || tRes.data)
        setSubjects(sRes.data.results || sRes.data)
      })
      .catch(() => {})
  }, [])

  const fetchSheet = async () => {
    try {
      const response = await api.get(`/payroll-sheets/${id}/`)
      setSheet(response.data)
    } catch (error) {
      console.error('Error fetching sheet:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id) return
    setEntryError('')
    setEntrySaving(true)
    try {
      await api.post('/payroll-entries/', {
        payroll_sheet: Number(id),
        teacher: Number(entryForm.teacher),
        subject: Number(entryForm.subject),
        date: entryForm.date,
        hours: entryForm.hours,
        rate_per_hour: entryForm.rate_per_hour || null,
        rate_per_group: entryForm.rate_per_group || null,
        amount: entryForm.amount,
        notes: entryForm.notes,
      })
      setEntryForm(emptyEntryForm)
      setShowAddForm(false)
      fetchSheet()
    } catch (err: unknown) {
      const res = err && typeof err === 'object' && 'response' in err ? (err as { response?: { data?: { detail?: string } } }).response : null
      setEntryError(res?.data?.detail || 'Не удалось добавить запись')
    } finally {
      setEntrySaving(false)
    }
  }

  const handleDeleteEntry = async (entryId: number) => {
    if (!confirm('Удалить эту запись?')) return
    try {
      await api.delete(`/payroll-entries/${entryId}/`)
      fetchSheet()
    } catch (error) {
      console.error('Error deleting entry:', error)
    }
  }

  const loadRate = async () => {
    if (!entryForm.subject || !entryForm.date) return
    try {
      const res = await api.get('/rates/', {
        params: { subject: entryForm.subject, date: entryForm.date, rate_kind: 'payment' },
      })
      const list = res.data.results || res.data
      if (Array.isArray(list) && list.length > 0) {
        const r = list[0]
        setEntryForm((prev) => ({
          ...prev,
          rate_per_hour: r.rate_type === 'hour' ? r.amount : '',
          rate_per_group: r.rate_type === 'group' ? r.amount : '',
        }))
      }
    } catch {
      // ignore
    }
  }

  const handleDeleteSheet = async () => {
    if (!id || !sheet || sheet.status !== 'draft') return
    if (!confirm('Удалить этот расчётный лист? Это действие нельзя отменить.')) return
    try {
      await api.delete(`/payroll-sheets/${id}/`)
      navigate('/payroll-sheets')
    } catch (error) {
      console.error('Error deleting sheet:', error)
    }
  }

  const handleSubmit = async () => {
    if (!id) return
    try {
      await api.post(`/payroll-sheets/${id}/submit/`)
      fetchSheet()
    } catch (error) {
      console.error('Error submitting sheet:', error)
    }
  }

  const handleExport = async () => {
    if (!id) return
    try {
      const response = await api.get(`/payroll-sheets/${id}/export_excel/`, {
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `payroll_${id}.xlsx`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error) {
      console.error('Error exporting sheet:', error)
    }
  }

  if (loading) {
    return <div className="text-center py-12">Загрузка...</div>
  }

  if (!sheet) {
    return <div className="text-center py-12">Расчётный лист не найден</div>
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <Link
            to="/payroll-sheets"
            className="text-indigo-600 hover:text-indigo-900 mb-2 inline-block"
          >
            ← Назад к списку
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">{sheet.title}</h1>
          <p className="text-gray-600 mt-1">
            {format(new Date(sheet.period_start), 'd MMM yyyy', { locale: ru })}{' '}
            - {format(new Date(sheet.period_end), 'd MMM yyyy', { locale: ru })}
          </p>
        </div>
        <div className="flex gap-2">
          {sheet.status === 'draft' && (
            <>
              <button
                onClick={handleSubmit}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Отправить
              </button>
              <button
                type="button"
                onClick={handleDeleteSheet}
                className="inline-flex items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md shadow-sm text-red-700 bg-white hover:bg-red-50"
              >
                Удалить лист
              </button>
            </>
          )}
          <button
            onClick={handleExport}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
          >
            Экспорт в Excel
          </button>
        </div>
      </div>

      {sheet.status === 'draft' && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-medium mb-4">
            {showAddForm ? 'Новая запись' : 'Добавить запись'}
          </h2>
          {!showAddForm ? (
            <button
              type="button"
              onClick={() => {
                setShowAddForm(true)
                if (sheet.teacher) {
                  setEntryForm((prev) => ({ ...prev, teacher: String(sheet.teacher) }))
                }
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Добавить запись
            </button>
          ) : (
            <form onSubmit={handleAddEntry} className="space-y-4">
              {entryError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">
                  {entryError}
                </div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Преподаватель</label>
                  <select
                    required
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    value={entryForm.teacher}
                    onChange={(e) => setEntryForm({ ...entryForm, teacher: e.target.value })}
                  >
                    <option value="">Выберите...</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>{t.full_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Предмет</label>
                  <select
                    required
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    value={entryForm.subject}
                    onChange={(e) => setEntryForm({ ...entryForm, subject: e.target.value })}
                  >
                    <option value="">Выберите...</option>
                    {(sheet.subject_ids && sheet.subject_ids.length > 0
                      ? subjects.filter((s) => sheet.subject_ids!.includes(s.id))
                      : subjects
                    ).map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Дата</label>
                  <input
                    type="date"
                    required
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    value={entryForm.date}
                    onChange={(e) => setEntryForm({ ...entryForm, date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Часы</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    value={entryForm.hours}
                    onChange={(e) => setEntryForm({ ...entryForm, hours: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Тариф за час</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    value={entryForm.rate_per_hour}
                    onChange={(e) => setEntryForm({ ...entryForm, rate_per_hour: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Тариф за группу</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    value={entryForm.rate_per_group}
                    onChange={(e) => setEntryForm({ ...entryForm, rate_per_group: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Сумма</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    value={entryForm.amount}
                    onChange={(e) => setEntryForm({ ...entryForm, amount: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Примечания</label>
                  <input
                    type="text"
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    value={entryForm.notes}
                    onChange={(e) => setEntryForm({ ...entryForm, notes: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={loadRate}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Подставить тариф
                </button>
                <button
                  type="submit"
                  disabled={entrySaving}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                >
                  {entrySaving ? 'Сохранение...' : 'Добавить'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAddForm(false); setEntryError(''); setEntryForm(emptyEntryForm); }}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Отмена
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-md mb-6">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-lg font-medium mb-4">Записи</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Дата
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Преподаватель
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Предмет
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Часы
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Сумма
                  </th>
                  {sheet.status === 'draft' && (
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Действия
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(sheet.entries || []).map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {format(new Date(entry.date), 'd MMM yyyy', { locale: ru })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {entry.teacher_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {entry.subject_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {entry.hours}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {parseFloat(entry.amount).toLocaleString('ru-RU', {
                        style: 'currency',
                        currency: 'RUB',
                      })}
                    </td>
                    {sheet.status === 'draft' && (
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <button
                          type="button"
                          onClick={() => handleDeleteEntry(entry.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Удалить
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-4 text-right text-sm font-medium text-gray-900"
                  >
                    Итого:
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                    {parseFloat(sheet.total_amount || '0').toLocaleString('ru-RU', {
                      style: 'currency',
                      currency: 'RUB',
                    })}
                  </td>
                  {sheet.status === 'draft' && <td />}
                </tr>
              </tfoot>
            </table>
          </div>
          {(sheet.entries || []).length === 0 && (
            <p className="text-center py-6 text-gray-500 text-sm">
              Записей пока нет. {sheet.status === 'draft' && 'Добавьте первую запись выше.'}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
