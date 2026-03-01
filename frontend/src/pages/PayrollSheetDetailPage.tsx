import { useEffect, useState, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import api from '../api/client'

interface IndividualEntry {
  id: number
  student_name: string
  lessons_count: number
  hours: string
  lesson_dates: string
}

interface GroupEntry {
  id: number
  group_name: string
  children_count: number
  grade_class: number
  is_pksh: boolean
  lessons_count: number
  hours: string
  lesson_dates: string
}

interface AdvanceItem {
  id: number
  teacher_name: string
  advance_type: string
  amount: string
  date: string
  description: string
}

interface PayrollSheet {
  id: number
  title: string
  teacher?: number
  teacher_name?: string
  period_start: string
  period_end: string
  status: string
  individual_entries: IndividualEntry[]
  group_entries: GroupEntry[]
  advances: AdvanceItem[]
  total_amount: string
  notes: string
  subject_ids?: number[]
  advance_debt: string
}

interface Subject {
  id: number
  name: string
}

interface IndividualPrice {
  id: number
  basic_rate: string
  premium_rate: string
  vacation_rate: string
  effective_from: string
  effective_to: string | null
}

interface GroupPrice {
  id: number
  class_from: number
  class_to: number
  basic_rate: string
  premium_rate: string
  vacation_rate: string
}

interface PkshPrice {
  id: number
  basic_rate: string
  premium_rate: string
  vacation_rate: string
}

const emptyIndForm = { student_name: '', lessons_count: '', hours: '', lesson_dates: '' }
const emptyGrpForm = { group_name: '', children_count: '', grade_class: '1', is_pksh: false, lessons_count: '', hours: '', lesson_dates: '' }

export default function PayrollSheetDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [sheet, setSheet] = useState<PayrollSheet | null>(null)
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)

  const [indPrice, setIndPrice] = useState<IndividualPrice | null>(null)
  const [grpPrices, setGrpPrices] = useState<GroupPrice[]>([])
  const [pkshPrice, setPkshPrice] = useState<PkshPrice | null>(null)

  const [showIndForm, setShowIndForm] = useState(false)
  const [showGrpForm, setShowGrpForm] = useState(false)
  const [indForm, setIndForm] = useState(emptyIndForm)
  const [grpForm, setGrpForm] = useState(emptyGrpForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const [showAdvanceModal, setShowAdvanceModal] = useState<'request' | 'payment' | null>(null)
  const [advanceAmount, setAdvanceAmount] = useState('')

  const fetchSheet = useCallback(async () => {
    try {
      const response = await api.get(`/payroll-sheets/${id}/`)
      setSheet(response.data)
    } catch (error) {
      console.error('Error fetching sheet:', error)
    } finally {
      setLoading(false)
    }
  }, [id])

  const fetchPrices = useCallback(async (periodStart: string) => {
    try {
      const [indRes, grpRes, pkshRes] = await Promise.all([
        api.get('/individual-prices/', { params: { date: periodStart } }),
        api.get('/group-prices/', { params: { date: periodStart } }),
        api.get('/pksh-prices/', { params: { date: periodStart } }),
      ])
      const indList = indRes.data.results || indRes.data
      setIndPrice(indList.length > 0 ? indList[0] : null)
      setGrpPrices(grpRes.data.results || grpRes.data)
      const pkshList = pkshRes.data.results || pkshRes.data
      setPkshPrice(pkshList.length > 0 ? pkshList[0] : null)
    } catch (error) {
      console.error('Error fetching prices:', error)
    }
  }, [])

  useEffect(() => {
    if (id && id !== 'new') {
      fetchSheet()
      api.get('/subjects/').then((r) => setSubjects(r.data.results || r.data)).catch(() => {})
    }
  }, [id, fetchSheet])

  useEffect(() => {
    if (sheet) {
      fetchPrices(sheet.period_start)
    }
  }, [sheet?.period_start, fetchPrices])

  const getGroupPriceForGrade = (grade: number): GroupPrice | null => {
    return grpPrices.find((p) => p.class_from <= grade && p.class_to >= grade) || null
  }

  const handleAddIndividual = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id) return
    setFormError('')
    setSaving(true)
    try {
      await api.post('/individual-lesson-entries/', {
        payroll_sheet: Number(id),
        student_name: indForm.student_name,
        lessons_count: parseInt(indForm.lessons_count) || 0,
        hours: parseFloat(indForm.hours) || 0,
        lesson_dates: indForm.lesson_dates,
      })
      setIndForm(emptyIndForm)
      setShowIndForm(false)
      fetchSheet()
    } catch {
      setFormError('Не удалось добавить запись')
    } finally {
      setSaving(false)
    }
  }

  const handleAddGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id) return
    setFormError('')
    setSaving(true)
    try {
      await api.post('/group-lesson-entries/', {
        payroll_sheet: Number(id),
        group_name: grpForm.group_name,
        children_count: parseInt(grpForm.children_count) || 0,
        grade_class: parseInt(grpForm.grade_class) || 1,
        is_pksh: grpForm.is_pksh,
        lessons_count: parseInt(grpForm.lessons_count) || 0,
        hours: parseFloat(grpForm.hours) || 0,
        lesson_dates: grpForm.lesson_dates,
      })
      setGrpForm(emptyGrpForm)
      setShowGrpForm(false)
      fetchSheet()
    } catch {
      setFormError('Не удалось добавить запись')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteIndEntry = async (entryId: number) => {
    if (!confirm('Удалить эту запись?')) return
    try {
      await api.delete(`/individual-lesson-entries/${entryId}/`)
      fetchSheet()
    } catch (error) {
      console.error(error)
    }
  }

  const handleDeleteGrpEntry = async (entryId: number) => {
    if (!confirm('Удалить эту запись?')) return
    try {
      await api.delete(`/group-lesson-entries/${entryId}/`)
      fetchSheet()
    } catch (error) {
      console.error(error)
    }
  }

  const handleDeleteSheet = async () => {
    if (!id || !sheet || sheet.status !== 'draft') return
    if (!confirm('Удалить этот расчётный лист? Это действие нельзя отменить.')) return
    try {
      await api.delete(`/payroll-sheets/${id}/`)
      navigate('/payroll-sheets')
    } catch (error) {
      console.error(error)
    }
  }

  const handleSubmitSheet = async () => {
    if (!id) return
    try {
      await api.post(`/payroll-sheets/${id}/submit/`)
      fetchSheet()
    } catch (error) {
      console.error(error)
    }
  }

  const handleExport = async () => {
    if (!id) return
    try {
      const response = await api.get(`/payroll-sheets/${id}/export_excel/`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `payroll_${id}.xlsx`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error) {
      console.error(error)
    }
  }

  const handleAdvance = async () => {
    if (!id || !showAdvanceModal) return
    const amount = parseFloat(advanceAmount)
    if (!amount || amount <= 0) return
    try {
      const endpoint = showAdvanceModal === 'request' ? 'request_advance' : 'pay_advance'
      await api.post(`/payroll-sheets/${id}/${endpoint}/`, { amount })
      setShowAdvanceModal(null)
      setAdvanceAmount('')
      fetchSheet()
    } catch (error) {
      console.error(error)
    }
  }

  // --- Calculations ---
  const indBasicRate = indPrice ? parseFloat(indPrice.basic_rate) : 0
  const indPremRate = indPrice ? parseFloat(indPrice.premium_rate) : 0
  const indVacRate = indPrice ? parseFloat(indPrice.vacation_rate) : 0

  const individualEntries = sheet?.individual_entries || []
  const groupEntries = sheet?.group_entries || []

  const indTotalBasic = individualEntries.reduce((sum, e) => sum + e.lessons_count * indBasicRate, 0)
  const indTotalPremium = individualEntries.reduce((sum, e) => sum + e.lessons_count * indPremRate, 0)
  const indTotalVacation = individualEntries.reduce((sum, e) => sum + e.lessons_count * indVacRate, 0)

  const getGroupBasic = (entry: GroupEntry): number => {
    if (entry.is_pksh) {
      return pkshPrice ? parseFloat(pkshPrice.basic_rate) : 0
    }
    const price = getGroupPriceForGrade(entry.grade_class)
    return price ? parseFloat(price.basic_rate) : 0
  }

  const getGroupPremium = (entry: GroupEntry): number => {
    if (entry.is_pksh) {
      return pkshPrice ? parseFloat(pkshPrice.premium_rate) : 0
    }
    const price = getGroupPriceForGrade(entry.grade_class)
    return price ? parseFloat(price.premium_rate) : 0
  }

  const getGroupVacation = (entry: GroupEntry): number => {
    if (entry.is_pksh) {
      return pkshPrice ? parseFloat(pkshPrice.vacation_rate) : 0
    }
    const price = getGroupPriceForGrade(entry.grade_class)
    return price ? parseFloat(price.vacation_rate) : 0
  }

  const grpTotalBasic = groupEntries.reduce((sum, e) => sum + e.children_count * e.lessons_count * getGroupBasic(e), 0)
  const grpTotalPremium = groupEntries.reduce((sum, e) => sum + e.children_count * e.lessons_count * getGroupPremium(e), 0)
  const grpTotalVacation = groupEntries.reduce((sum, e) => sum + e.children_count * e.lessons_count * getGroupVacation(e), 0)

  const totalBasic = indTotalBasic + grpTotalBasic
  const totalPremium = indTotalPremium + grpTotalPremium
  const totalVacation = indTotalVacation + grpTotalVacation
  const advanceDebt = sheet ? parseFloat(sheet.advance_debt || '0') : 0
  const totalPayout = totalBasic - advanceDebt

  const formatCurrency = (val: number) =>
    val.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB' })

  const sheetSubjectNames = subjects
    .filter((s) => sheet?.subject_ids?.includes(s.id))
    .map((s) => s.name)
    .join(', ')

  if (loading) return <div className="text-center py-12">Загрузка...</div>
  if (!sheet) return <div className="text-center py-12">Расчётный лист не найден</div>

  const isDraft = sheet.status === 'draft'

  return (
    <div className="px-4 py-6 sm:px-0">
      {/* Header */}
      <div className="mb-6 flex justify-between items-start">
        <div>
          <Link to="/payroll-sheets" className="text-indigo-600 hover:text-indigo-900 mb-2 inline-block">
            &larr; Назад к списку
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{sheet.title}</h1>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          {isDraft && (
            <>
              <button onClick={handleSubmitSheet} className="px-4 py-2 text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700">
                Отправить
              </button>
              <button onClick={handleDeleteSheet} className="px-4 py-2 text-sm font-medium rounded-md border border-red-300 text-red-700 bg-white hover:bg-red-50">
                Удалить лист
              </button>
            </>
          )}
          <button onClick={handleExport} className="px-4 py-2 text-sm font-medium rounded-md border border-gray-300 text-gray-700 bg-white hover:bg-gray-50">
            Экспорт Excel
          </button>
        </div>
      </div>

      {/* Period & Teacher Info */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-sm font-medium text-gray-500">Период:</span>
            </div>
            <div className="flex items-baseline gap-4">
              <div>
                <span className="text-sm text-gray-500">с </span>
                <span className="text-sm font-semibold text-gray-900">
                  {format(new Date(sheet.period_start), 'd MMMM yyyy', { locale: ru })}
                </span>
              </div>
              <div>
                <span className="text-sm text-gray-500">по </span>
                <span className="text-sm font-semibold text-gray-900">
                  {format(new Date(sheet.period_end), 'd MMMM yyyy', { locale: ru })}
                </span>
              </div>
            </div>
          </div>
          <div>
            <div className="mb-2">
              <span className="text-sm text-gray-500">Сотрудник: </span>
              <span className="text-sm font-semibold text-gray-900">{sheet.teacher_name || 'Не указан'}</span>
            </div>
            <div>
              <span className="text-sm text-gray-500">Предмет: </span>
              <span className="text-sm font-semibold text-gray-900">{sheetSubjectNames || 'Не указаны'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Individual Lessons Section */}
      <div className="bg-white shadow rounded-lg mb-6 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-blue-50">
          <h2 className="text-lg font-semibold text-center text-blue-900">Индивидуальные занятия</h2>
          {indPrice && (
            <p className="text-sm text-center text-blue-700 mt-1">
              Оплата за одного ученика: основные <strong>{formatCurrency(indBasicRate)}</strong>,
              премиальные <strong>{formatCurrency(indPremRate)}</strong>,
              отпускные <strong>{formatCurrency(indVacRate)}</strong>
            </p>
          )}
          {!indPrice && (
            <p className="text-sm text-center text-yellow-700 mt-1">Цена индивидуальных занятий не настроена для данного периода</p>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ФИ ученика</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Занятий</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Часов</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Даты занятий</th>
                {isDraft && <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Действия</th>}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {individualEntries.map((entry) => (
                <tr key={entry.id}>
                  <td className="px-6 py-4 text-sm text-gray-900">{entry.student_name}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{entry.lessons_count}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{entry.hours}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{entry.lesson_dates}</td>
                  {isDraft && (
                    <td className="px-6 py-4 text-right text-sm">
                      <button onClick={() => handleDeleteIndEntry(entry.id)} className="text-red-600 hover:text-red-800">Удалить</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {individualEntries.length === 0 && (
          <p className="text-center py-6 text-gray-500 text-sm">Нет записей</p>
        )}

        {isDraft && (
          <div className="px-6 py-4 border-t border-gray-200">
            {!showIndForm ? (
              <button
                onClick={() => setShowIndForm(true)}
                className="px-4 py-2 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Добавить ученика
              </button>
            ) : (
              <form onSubmit={handleAddIndividual} className="space-y-3">
                {formError && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">{formError}</div>}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">ФИ ученика</label>
                    <input type="text" required className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={indForm.student_name} onChange={(e) => setIndForm({ ...indForm, student_name: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Занятий</label>
                    <input type="number" min="0" required className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={indForm.lessons_count} onChange={(e) => setIndForm({ ...indForm, lessons_count: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Часов</label>
                    <input type="number" step="0.01" min="0" required className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={indForm.hours} onChange={(e) => setIndForm({ ...indForm, hours: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Даты занятий</label>
                    <input type="text" placeholder="01.03, 05.03, 12.03" className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={indForm.lesson_dates} onChange={(e) => setIndForm({ ...indForm, lesson_dates: e.target.value })} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">
                    {saving ? 'Сохранение...' : 'Добавить'}
                  </button>
                  <button type="button" onClick={() => { setShowIndForm(false); setFormError(''); setIndForm(emptyIndForm) }} className="px-4 py-2 text-sm font-medium rounded-md border border-gray-300 text-gray-700 bg-white hover:bg-gray-50">
                    Отмена
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Group Lessons Section */}
      <div className="bg-white shadow rounded-lg mb-6 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-green-50">
          <h2 className="text-lg font-semibold text-center text-green-900">Групповые занятия</h2>
          {grpPrices.length > 0 && (
            <div className="text-sm text-center text-green-700 mt-1">
              {grpPrices.map((gp, i) => (
                <span key={i}>
                  {i > 0 && ' | '}
                  {gp.class_from}–{gp.class_to} кл.: осн. <strong>{formatCurrency(parseFloat(gp.basic_rate))}</strong>,
                  прем. <strong>{formatCurrency(parseFloat(gp.premium_rate))}</strong>,
                  отп. <strong>{formatCurrency(parseFloat(gp.vacation_rate))}</strong>
                </span>
              ))}
            </div>
          )}
          {pkshPrice && (
            <p className="text-sm text-center text-green-700 mt-1">
              ПКШ: осн. <strong>{formatCurrency(parseFloat(pkshPrice.basic_rate))}</strong>,
              прем. <strong>{formatCurrency(parseFloat(pkshPrice.premium_rate))}</strong>,
              отп. <strong>{formatCurrency(parseFloat(pkshPrice.vacation_rate))}</strong>
            </p>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Состав группы</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Детей в группе</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Класс</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Занятий</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Часов</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Даты занятий</th>
                {isDraft && <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Действия</th>}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {groupEntries.map((entry) => (
                <tr key={entry.id} className={entry.is_pksh ? 'bg-amber-50' : ''}>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {entry.is_pksh && <span className="inline-block bg-amber-200 text-amber-800 text-xs px-1.5 py-0.5 rounded mr-1">ПКШ</span>}
                    {entry.group_name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{entry.children_count}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{entry.is_pksh ? 'ПКШ' : `${entry.grade_class} кл.`}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{entry.lessons_count}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{entry.hours}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{entry.lesson_dates}</td>
                  {isDraft && (
                    <td className="px-6 py-4 text-right text-sm">
                      <button onClick={() => handleDeleteGrpEntry(entry.id)} className="text-red-600 hover:text-red-800">Удалить</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {groupEntries.length === 0 && (
          <p className="text-center py-6 text-gray-500 text-sm">Нет записей</p>
        )}

        {isDraft && (
          <div className="px-6 py-4 border-t border-gray-200">
            {!showGrpForm ? (
              <button
                onClick={() => setShowGrpForm(true)}
                className="px-4 py-2 text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
              >
                Добавить группу
              </button>
            ) : (
              <form onSubmit={handleAddGroup} className="space-y-3">
                {formError && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">{formError}</div>}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Состав группы</label>
                    <input type="text" required className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={grpForm.group_name} onChange={(e) => setGrpForm({ ...grpForm, group_name: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Детей в группе</label>
                    <input type="number" min="0" required className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={grpForm.children_count} onChange={(e) => setGrpForm({ ...grpForm, children_count: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Класс</label>
                    <input type="number" min="0" max="11" className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={grpForm.grade_class} onChange={(e) => setGrpForm({ ...grpForm, grade_class: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Занятий</label>
                    <input type="number" min="0" required className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={grpForm.lessons_count} onChange={(e) => setGrpForm({ ...grpForm, lessons_count: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Часов</label>
                    <input type="number" step="0.01" min="0" required className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={grpForm.hours} onChange={(e) => setGrpForm({ ...grpForm, hours: e.target.value })} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Даты занятий</label>
                    <input type="text" placeholder="01.03, 05.03, 12.03" className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={grpForm.lesson_dates} onChange={(e) => setGrpForm({ ...grpForm, lesson_dates: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={grpForm.is_pksh}
                      onChange={(e) => setGrpForm({ ...grpForm, is_pksh: e.target.checked })}
                      className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                    />
                    <span className="text-sm text-gray-700">ПКШ (подготовка к школе)</span>
                  </label>
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50">
                    {saving ? 'Сохранение...' : 'Добавить'}
                  </button>
                  <button type="button" onClick={() => { setShowGrpForm(false); setFormError(''); setGrpForm(emptyGrpForm) }} className="px-4 py-2 text-sm font-medium rounded-md border border-gray-300 text-gray-700 bg-white hover:bg-gray-50">
                    Отмена
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Totals */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4 text-gray-900">Итого</h2>
        <div className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-sm text-gray-700 font-medium">Итого к выдаче (основные):</span>
            <span className="text-lg font-bold text-gray-900">{formatCurrency(totalBasic)}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-sm text-gray-700">Премиальные за индивидуальные:</span>
            <span className="text-sm font-semibold text-gray-900">{formatCurrency(indTotalPremium)}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-sm text-gray-700">Премиальные за группы:</span>
            <span className="text-sm font-semibold text-gray-900">{formatCurrency(grpTotalPremium)}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-sm text-gray-700 font-medium">Премиальные всего:</span>
            <span className="text-sm font-bold text-gray-900">{formatCurrency(totalPremium)}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-sm text-gray-700 font-medium">К отпускным добавится:</span>
            <span className="text-sm font-bold text-gray-900">{formatCurrency(totalVacation)}</span>
          </div>

          {advanceDebt > 0 && (
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm text-red-700 font-medium">Долг по авансу:</span>
              <span className="text-sm font-bold text-red-700">−{formatCurrency(advanceDebt)}</span>
            </div>
          )}

          <div className="flex justify-between items-center py-3 bg-indigo-50 rounded-md px-4 -mx-2">
            <span className="text-base text-indigo-900 font-semibold">К выдаче (с учётом аванса):</span>
            <span className="text-xl font-bold text-indigo-700">{formatCurrency(totalPayout > 0 ? totalPayout : 0)}</span>
          </div>
        </div>
      </div>

      {/* Advance Buttons */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4 text-gray-900">Аванс</h2>
        {advanceDebt > 0 && (
          <p className="text-sm text-red-600 mb-3">Текущий долг по авансу: {formatCurrency(advanceDebt)}</p>
        )}
        {advanceDebt <= 0 && (
          <p className="text-sm text-green-600 mb-3">Нет долга по авансу</p>
        )}
        <div className="flex gap-3">
          <button
            onClick={() => setShowAdvanceModal('request')}
            className="px-4 py-2 text-sm font-medium rounded-md text-white bg-amber-600 hover:bg-amber-700"
          >
            Запросить аванс
          </button>
          <button
            onClick={() => setShowAdvanceModal('payment')}
            className="px-4 py-2 text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700"
            disabled={advanceDebt <= 0}
          >
            Выплатить аванс
          </button>
        </div>

        {(sheet.advances || []).length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">История авансов</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Дата</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Тип</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Сумма</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Описание</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sheet.advances.map((adv) => (
                    <tr key={adv.id}>
                      <td className="px-4 py-2 text-gray-900">{format(new Date(adv.date), 'd MMM yyyy', { locale: ru })}</td>
                      <td className="px-4 py-2">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${adv.advance_type === 'request' ? 'bg-amber-100 text-amber-800' : 'bg-teal-100 text-teal-800'}`}>
                          {adv.advance_type === 'request' ? 'Запрос' : 'Выплата'}
                        </span>
                      </td>
                      <td className="px-4 py-2 font-medium text-gray-900">{formatCurrency(parseFloat(adv.amount))}</td>
                      <td className="px-4 py-2 text-gray-500">{adv.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Advance Modal */}
      {showAdvanceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">
              {showAdvanceModal === 'request' ? 'Запросить аванс' : 'Выплатить аванс'}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {showAdvanceModal === 'request'
                ? 'Аванс будет записан как долг и вычтен из будущих выплат.'
                : 'Сумма будет вычтена из текущего долга по авансу.'}
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Сумма</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={advanceAmount}
                onChange={(e) => setAdvanceAmount(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAdvance}
                disabled={!advanceAmount || parseFloat(advanceAmount) <= 0}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-md text-white disabled:opacity-50 ${
                  showAdvanceModal === 'request' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-teal-600 hover:bg-teal-700'
                }`}
              >
                {showAdvanceModal === 'request' ? 'Запросить' : 'Выплатить'}
              </button>
              <button
                onClick={() => { setShowAdvanceModal(null); setAdvanceAmount('') }}
                className="flex-1 px-4 py-2 text-sm font-medium rounded-md border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
