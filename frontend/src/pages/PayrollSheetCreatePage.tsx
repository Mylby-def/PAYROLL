import { useState, FormEvent, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import api from '../api/client'

interface Teacher { id: number; full_name: string; subject_ids: number[]; subject_names: string[] }
interface Subject { id: number; name: string }

export default function PayrollSheetCreatePage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [teacherId, setTeacherId] = useState('')
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<number[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const isTeacher = user?.role === 'teacher' || user?.role === 'employee'

  useEffect(() => {
    Promise.all([api.get('/teachers/'), api.get('/subjects/')])
      .then(([tRes, sRes]) => {
        const tList = tRes.data.results || tRes.data
        const sList = sRes.data.results || sRes.data
        setTeachers(tList)
        setSubjects(sList)
        if (isTeacher && user?.teacher_id) {
          const myTeacher = tList.find((t: Teacher) => t.id === user.teacher_id)
          if (myTeacher) {
            setTeacherId(String(myTeacher.id))
            if (myTeacher.subject_ids?.length > 0) {
              setSelectedSubjectIds(myTeacher.subject_ids)
            }
          }
        }
      })
      .catch(() => {})
  }, [])

  const handleTeacherChange = (id: string) => {
    setTeacherId(id)
    if (id) {
      const t = teachers.find((t) => t.id === Number(id))
      if (t?.subject_ids?.length) setSelectedSubjectIds(t.subject_ids)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.post('/payroll-sheets/', {
        teacher: teacherId ? Number(teacherId) : null,
        period_start: periodStart,
        period_end: periodEnd,
        subjects: selectedSubjectIds,
      })
      navigate(`/payroll-sheets/${res.data.id}`)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Не удалось создать расчётный лист')
    } finally {
      setLoading(false)
    }
  }

  const toggleSubject = (id: number) => {
    setSelectedSubjectIds((p) => p.includes(id) ? p.filter((s) => s !== id) : [...p, id])
  }

  const selectedTeacher = teachers.find((t) => t.id === Number(teacherId))

  return (
    <div>
      <Link to="/payroll-sheets" className="text-indigo-600 hover:text-indigo-800 text-sm font-medium transition">
        &larr; Назад к списку
      </Link>
      <div className="max-w-lg mt-4">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Новый расчётный лист</h1>
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>
          )}

          {isTeacher ? (
            <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
              <p className="text-sm font-medium text-indigo-900">Сотрудник: {selectedTeacher?.full_name || user?.first_name}</p>
              {selectedTeacher?.subject_names?.length ? (
                <p className="text-xs text-indigo-600 mt-1">Предметы: {selectedTeacher.subject_names.join(', ')}</p>
              ) : null}
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Педагог</label>
              <select required className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm" value={teacherId} onChange={(e) => handleTeacherChange(e.target.value)}>
                <option value="">Выберите...</option>
                {teachers.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Период с</label>
              <input type="date" required className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Период по</label>
              <input type="date" required className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Предметы</label>
            <div className="border border-slate-200 rounded-xl p-3 max-h-40 overflow-y-auto space-y-1.5">
              {subjects.map((s) => (
                <label key={s.id} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={selectedSubjectIds.includes(s.id)} onChange={() => toggleSubject(s.id)} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                  <span className="text-sm text-slate-800">{s.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition shadow-sm">
              {loading ? 'Создание...' : 'Создать'}
            </button>
            <Link to="/payroll-sheets" className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition">
              Отмена
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
