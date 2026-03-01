import { useEffect, useState, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { useAuthStore } from '../store/authStore'
import api from '../api/client'

interface IndEntry { id: number; student_name: string; lessons_count: number; hours: string; lesson_dates: string }
interface GrpEntry { id: number; group_name: string; children_count: number; grade_class: number; is_pksh: boolean; lessons_count: number; hours: string; lesson_dates: string }
interface AdvItem { id: number; advance_type: string; status: string; amount: string; date: string; description: string }
interface Sheet {
  id: number; title: string; teacher?: number; teacher_name?: string
  period_start: string; period_end: string; status: string; rejection_comment: string
  individual_entries: IndEntry[]; group_entries: GrpEntry[]; advances: AdvItem[]
  total_basic: string; total_premium: string; total_vacation: string; advance_amount: string
  subject_ids?: number[]; advance_debt: string; notes: string
}
interface Subject { id: number; name: string }
interface IndPrice { basic_rate: string; premium_rate: string; vacation_rate: string }
interface GrpPrice { class_from: number; class_to: number; basic_rate: string; premium_rate: string; vacation_rate: string }
interface PkshPriceT { basic_rate: string; premium_rate: string; vacation_rate: string }

interface DraftIndRow { student_name: string; lessons_count: string; hours: string; lesson_dates: string }
interface DraftGrpRow { group_name: string; children_count: string; grade_class: string; lessons_count: string; hours: string; lesson_dates: string }

const emptyInd = (): DraftIndRow => ({ student_name: '', lessons_count: '', hours: '', lesson_dates: '' })
const emptyGrp = (): DraftGrpRow => ({ group_name: '', children_count: '', grade_class: '1', lessons_count: '', hours: '', lesson_dates: '' })

export default function PayrollSheetDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [sheet, setSheet] = useState<Sheet | null>(null)
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [indPrice, setIndPrice] = useState<IndPrice | null>(null)
  const [grpPrices, setGrpPrices] = useState<GrpPrice[]>([])
  const [pkshPrice, setPkshPrice] = useState<PkshPriceT | null>(null)
  const [draftInd, setDraftInd] = useState<DraftIndRow[]>([])
  const [draftGrp, setDraftGrp] = useState<DraftGrpRow[]>([])
  const [saving, setSaving] = useState(false)
  const [advanceAmount, setAdvanceAmount] = useState('')
  const [showAdvModal, setShowAdvModal] = useState<'request' | 'repay' | null>(null)

  const fetchSheet = useCallback(async () => {
    try {
      const r = await api.get(`/payroll-sheets/${id}/`)
      setSheet(r.data)
    } catch {} finally { setLoading(false) }
  }, [id])

  const fetchPrices = useCallback(async (d: string) => {
    try {
      const [iR, gR, pR] = await Promise.all([
        api.get('/individual-prices/', { params: { date: d } }),
        api.get('/group-prices/'),
        api.get('/pksh-prices/', { params: { date: d } }),
      ])
      const iL = iR.data.results || iR.data
      setIndPrice(iL.length > 0 ? iL[0] : null)
      setGrpPrices(gR.data.results || gR.data)
      const pL = pR.data.results || pR.data
      setPkshPrice(pL.length > 0 ? pL[0] : null)
    } catch {}
  }, [])

  useEffect(() => {
    if (id && id !== 'new') { fetchSheet(); api.get('/subjects/').then((r) => setSubjects(r.data.results || r.data)).catch(() => {}) }
  }, [id, fetchSheet])

  useEffect(() => { if (sheet) fetchPrices(sheet.period_start) }, [sheet?.period_start])

  // Calculations
  const p = (v: string | undefined) => parseFloat(v || '0')
  const indBasic = indPrice ? p(indPrice.basic_rate) : 0
  const indPrem = indPrice ? p(indPrice.premium_rate) : 0
  const indVac = indPrice ? p(indPrice.vacation_rate) : 0

  const getGrpPrice = (grade: number) => {
    if (grade === 0) return pkshPrice ? { basic: p(pkshPrice.basic_rate), prem: p(pkshPrice.premium_rate), vac: p(pkshPrice.vacation_rate) } : { basic: 0, prem: 0, vac: 0 }
    const gp = grpPrices.find((g) => g.class_from <= grade && g.class_to >= grade)
    return gp ? { basic: p(gp.basic_rate), prem: p(gp.premium_rate), vac: p(gp.vacation_rate) } : { basic: 0, prem: 0, vac: 0 }
  }

  const indEntries = sheet?.individual_entries || []
  const grpEntries = sheet?.group_entries || []

  const indTotalBasic = indEntries.reduce((s, e) => s + e.lessons_count * indBasic, 0)
  const indTotalPrem = indEntries.reduce((s, e) => s + e.lessons_count * indPrem, 0)
  const indTotalVac = indEntries.reduce((s, e) => s + e.lessons_count * indVac, 0)

  const grpTotalBasic = grpEntries.reduce((s, e) => s + e.children_count * e.lessons_count * getGrpPrice(e.grade_class).basic, 0)
  const grpTotalPrem = grpEntries.reduce((s, e) => s + e.children_count * e.lessons_count * getGrpPrice(e.grade_class).prem, 0)
  const grpTotalVac = grpEntries.reduce((s, e) => s + e.children_count * e.lessons_count * getGrpPrice(e.grade_class).vac, 0)

  const totalBasic = indTotalBasic + grpTotalBasic
  const totalPrem = indTotalPrem + grpTotalPrem
  const totalVac = indTotalVac + grpTotalVac
  const advDebt = sheet ? p(sheet.advance_debt) : 0
  const advAmount = sheet ? p(sheet.advance_amount) : 0

  const fmt = (v: number) => v.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB' })
  const fmtDate = (d: string) => format(new Date(d), 'd MMMM yyyy', { locale: ru })

  // Batch save individual
  const saveIndBatch = async () => {
    if (!id) return
    const valid = draftInd.filter((r) => r.student_name.trim())
    if (valid.length === 0) return
    setSaving(true)
    try {
      await api.post('/individual-lesson-entries/bulk_create/', valid.map((r) => ({
        payroll_sheet: Number(id), student_name: r.student_name,
        lessons_count: parseInt(r.lessons_count) || 0,
        hours: parseFloat(r.hours) || 0, lesson_dates: r.lesson_dates,
      })))
      setDraftInd([])
      fetchSheet()
    } catch {} finally { setSaving(false) }
  }

  const saveGrpBatch = async () => {
    if (!id) return
    const valid = draftGrp.filter((r) => r.group_name.trim())
    if (valid.length === 0) return
    setSaving(true)
    try {
      await api.post('/group-lesson-entries/bulk_create/', valid.map((r) => ({
        payroll_sheet: Number(id), group_name: r.group_name,
        children_count: parseInt(r.children_count) || 0,
        grade_class: r.grade_class === 'ПКШ' ? 0 : parseInt(r.grade_class) || 0,
        lessons_count: parseInt(r.lessons_count) || 0,
        hours: parseFloat(r.hours) || 0, lesson_dates: r.lesson_dates,
      })))
      setDraftGrp([])
      fetchSheet()
    } catch {} finally { setSaving(false) }
  }

  const handleDeleteInd = async (eid: number) => {
    if (!confirm('Удалить?')) return
    await api.delete(`/individual-lesson-entries/${eid}/`).catch(() => {})
    fetchSheet()
  }
  const handleDeleteGrp = async (eid: number) => {
    if (!confirm('Удалить?')) return
    await api.delete(`/group-lesson-entries/${eid}/`).catch(() => {})
    fetchSheet()
  }

  const handleDeleteSheet = async () => {
    if (!confirm('Удалить расчётный лист?')) return
    await api.delete(`/payroll-sheets/${id}/`).catch(() => {})
    navigate('/payroll-sheets')
  }

  const handleSubmitSheet = async () => {
    try {
      await api.post(`/payroll-sheets/${id}/submit/`, {
        total_basic: totalBasic, total_premium: totalPrem, total_vacation: totalVac,
        advance_amount: advAmount,
      })
      fetchSheet()
    } catch (err: any) { alert(err.response?.data?.detail || 'Ошибка') }
  }

  const handleAdvance = async () => {
    if (!showAdvModal || !advanceAmount) return
    const amt = parseFloat(advanceAmount)
    if (amt <= 0) return
    try {
      if (showAdvModal === 'request') {
        await api.post(`/payroll-sheets/${id}/request_advance/`, { amount: amt })
      } else {
        await api.post(`/payroll-sheets/${id}/repay_advance/`, { amount: amt })
      }
      setShowAdvModal(null)
      setAdvanceAmount('')
      fetchSheet()
    } catch (err: any) { alert(err.response?.data?.detail || 'Ошибка') }
  }

  const handleExport = async () => {
    try {
      const r = await api.get(`/payroll-sheets/${id}/export_excel/`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([r.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `payroll_${id}.xlsx`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch {}
  }

  const updateDraftInd = (idx: number, field: keyof DraftIndRow, val: string) => {
    setDraftInd((prev) => prev.map((r, i) => i === idx ? { ...r, [field]: val } : r))
  }
  const updateDraftGrp = (idx: number, field: keyof DraftGrpRow, val: string) => {
    setDraftGrp((prev) => prev.map((r, i) => i === idx ? { ...r, [field]: val } : r))
  }

  const sheetSubjectNames = subjects.filter((s) => sheet?.subject_ids?.includes(s.id)).map((s) => s.name).join(', ')

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-500">Загрузка...</div>
  if (!sheet) return <div className="text-center py-16 text-slate-400">Расчётный лист не найден</div>

  const isTeacher = user?.role === 'teacher'
  const canEdit = sheet.status === 'draft' || sheet.status === 'rejected'
  const isDraft = isTeacher ? canEdit : canEdit

  return (
    <div>
      <Link to="/payroll-sheets" className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">&larr; Назад</Link>

      {/* Header */}
      <div className="mt-4 mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{sheet.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
              sheet.status === 'draft' ? 'bg-slate-100 text-slate-600' :
              sheet.status === 'submitted' ? 'bg-blue-100 text-blue-700' :
              sheet.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
              sheet.status === 'rejected' ? 'bg-red-100 text-red-700' :
              'bg-slate-100 text-slate-600'
            }`}>
              {sheet.status === 'draft' ? 'Черновик' : sheet.status === 'submitted' ? 'На проверке' : sheet.status === 'approved' ? 'Одобрен' : sheet.status === 'rejected' ? 'Отклонён' : sheet.status}
            </span>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {isDraft && <button onClick={handleSubmitSheet} className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition shadow-sm">Отправить</button>}
          {isDraft && <button onClick={handleDeleteSheet} className="px-4 py-2 rounded-xl text-sm font-semibold text-red-700 bg-red-50 hover:bg-red-100 transition">Удалить</button>}
          <button onClick={handleExport} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition">Excel</button>
        </div>
      </div>

      {/* Rejection banner */}
      {sheet.status === 'rejected' && sheet.rejection_comment && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <p className="text-sm font-semibold text-red-800">Отклонено по причине:</p>
          <p className="text-sm text-red-700 mt-1">{sheet.rejection_comment}</p>
        </div>
      )}

      {/* Period & Teacher */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-slate-500 uppercase font-semibold tracking-wider mb-1">Период</p>
            <p className="text-sm text-slate-900">с <strong>{fmtDate(sheet.period_start)}</strong> по <strong>{fmtDate(sheet.period_end)}</strong></p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase font-semibold tracking-wider mb-1">Сотрудник</p>
            <p className="text-sm font-medium text-slate-900">{sheet.teacher_name || 'Не указан'}</p>
            <p className="text-xs text-slate-500 mt-0.5">Предмет: {sheetSubjectNames || 'Не указаны'}</p>
          </div>
        </div>
      </div>

      {/* Individual Lessons */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6 overflow-hidden">
        <div className="px-5 py-4 bg-blue-50 border-b border-blue-100">
          <h2 className="text-base font-semibold text-center text-blue-900">Индивидуальные занятия</h2>
          {indPrice && (
            <p className="text-xs text-center text-blue-700 mt-1">
              Оплата за одного ученика: основные <strong>{fmt(indBasic)}</strong>, премиальные <strong>{fmt(indPrem)}</strong>, отпускные <strong>{fmt(indVac)}</strong>
            </p>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">ФИ ученика</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">Занятий</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">Часов</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">Даты занятий</th>
                {isDraft && <th className="px-4 py-2.5 w-16" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {indEntries.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50">
                  {isDraft ? (
                    <>
                      <td className="px-4 py-1.5"><input type="text" defaultValue={e.student_name} className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm bg-transparent focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400" onBlur={(ev) => api.patch(`/individual-lesson-entries/${e.id}/`, { student_name: ev.target.value }).then(() => fetchSheet())} /></td>
                      <td className="px-4 py-1.5"><input type="number" min="0" defaultValue={e.lessons_count} className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm bg-transparent focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400" onBlur={(ev) => api.patch(`/individual-lesson-entries/${e.id}/`, { lessons_count: parseInt(ev.target.value) || 0 }).then(() => fetchSheet())} /></td>
                      <td className="px-4 py-1.5"><input type="number" step="0.01" min="0" defaultValue={e.hours} className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm bg-transparent focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400" onBlur={(ev) => api.patch(`/individual-lesson-entries/${e.id}/`, { hours: parseFloat(ev.target.value) || 0 }).then(() => fetchSheet())} /></td>
                      <td className="px-4 py-1.5"><input type="text" placeholder="01.03, 05.03, 12.03" defaultValue={e.lesson_dates} className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm bg-transparent focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400" onBlur={(ev) => api.patch(`/individual-lesson-entries/${e.id}/`, { lesson_dates: ev.target.value }).then(() => fetchSheet())} /></td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 text-sm text-slate-900">{e.student_name}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{e.lessons_count}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{e.hours}</td>
                      <td className="px-4 py-3 text-sm text-slate-500">{e.lesson_dates}</td>
                    </>
                  )}
                  {isDraft && <td className="px-4 py-3 text-right"><button onClick={() => handleDeleteInd(e.id)} className="text-xs text-red-500 hover:text-red-700">✕</button></td>}
                </tr>
              ))}
              {/* Draft rows */}
              {draftInd.map((r, i) => (
                <tr key={`d-${i}`} className="bg-blue-50/50">
                  <td className="px-4 py-2"><input type="text" placeholder="ФИ ученика" className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm" value={r.student_name} onChange={(e) => updateDraftInd(i, 'student_name', e.target.value)} /></td>
                  <td className="px-4 py-2"><input type="number" min="0" className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm" value={r.lessons_count} onChange={(e) => updateDraftInd(i, 'lessons_count', e.target.value)} /></td>
                  <td className="px-4 py-2"><input type="number" step="0.01" min="0" className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm" value={r.hours} onChange={(e) => updateDraftInd(i, 'hours', e.target.value)} /></td>
                  <td className="px-4 py-2"><input type="text" placeholder="01.03, 05.03" className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm" value={r.lesson_dates} onChange={(e) => updateDraftInd(i, 'lesson_dates', e.target.value)} /></td>
                  <td className="px-4 py-2 text-right"><button onClick={() => setDraftInd((p) => p.filter((_, j) => j !== i))} className="text-xs text-red-500">✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {indEntries.length === 0 && draftInd.length === 0 && <p className="text-center py-6 text-slate-400 text-sm">Нет записей</p>}
        {isDraft && (
          <div className="px-5 py-3 border-t border-slate-200 flex gap-2">
            <button onClick={() => setDraftInd((p) => [...p, emptyInd()])} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 transition">+ Добавить строку</button>
            {draftInd.length > 0 && (
              <button onClick={saveIndBatch} disabled={saving} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition">
                {saving ? 'Сохранение...' : 'Сохранить'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Group Lessons */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6 overflow-hidden">
        <div className="px-5 py-4 bg-emerald-50 border-b border-emerald-100">
          <h2 className="text-base font-semibold text-center text-emerald-900">Групповые занятия</h2>
          <div className="text-xs text-center text-emerald-700 mt-1 space-y-0.5">
            {grpPrices.map((g, i) => (
              <p key={i}>{g.class_from}–{g.class_to} кл.: осн. <strong>{fmt(p(g.basic_rate))}</strong>, прем. <strong>{fmt(p(g.premium_rate))}</strong>, отп. <strong>{fmt(p(g.vacation_rate))}</strong></p>
            ))}
            {pkshPrice && <p>ПКШ: осн. <strong>{fmt(p(pkshPrice.basic_rate))}</strong>, прем. <strong>{fmt(p(pkshPrice.premium_rate))}</strong>, отп. <strong>{fmt(p(pkshPrice.vacation_rate))}</strong></p>}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">Состав группы</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">Детей</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">Класс</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">Занятий</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">Часов</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">Даты</th>
                {isDraft && <th className="px-4 py-2.5 w-16" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {grpEntries.map((e) => (
                <tr key={e.id} className={`hover:bg-slate-50 ${e.grade_class === 0 ? 'bg-amber-50/30' : ''}`}>
                  {isDraft ? (
                    <>
                      <td className="px-4 py-1.5"><input type="text" defaultValue={e.group_name} className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm bg-transparent focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400" onBlur={(ev) => api.patch(`/group-lesson-entries/${e.id}/`, { group_name: ev.target.value }).then(() => fetchSheet())} /></td>
                      <td className="px-4 py-1.5"><input type="number" min="0" defaultValue={e.children_count} className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm bg-transparent focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400" onBlur={(ev) => api.patch(`/group-lesson-entries/${e.id}/`, { children_count: parseInt(ev.target.value) || 0 }).then(() => fetchSheet())} /></td>
                      <td className="px-4 py-1.5"><input type="text" defaultValue={e.grade_class === 0 ? 'ПКШ' : String(e.grade_class)} className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm bg-transparent focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400" onBlur={(ev) => { const v = ev.target.value; api.patch(`/group-lesson-entries/${e.id}/`, { grade_class: v === 'ПКШ' || v === 'пкш' ? 0 : parseInt(v) || 0 }).then(() => fetchSheet()) }} /></td>
                      <td className="px-4 py-1.5"><input type="number" min="0" defaultValue={e.lessons_count} className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm bg-transparent focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400" onBlur={(ev) => api.patch(`/group-lesson-entries/${e.id}/`, { lessons_count: parseInt(ev.target.value) || 0 }).then(() => fetchSheet())} /></td>
                      <td className="px-4 py-1.5"><input type="number" step="0.01" min="0" defaultValue={e.hours} className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm bg-transparent focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400" onBlur={(ev) => api.patch(`/group-lesson-entries/${e.id}/`, { hours: parseFloat(ev.target.value) || 0 }).then(() => fetchSheet())} /></td>
                      <td className="px-4 py-1.5"><input type="text" placeholder="01.03, 05.03, 12.03" defaultValue={e.lesson_dates} className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm bg-transparent focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400" onBlur={(ev) => api.patch(`/group-lesson-entries/${e.id}/`, { lesson_dates: ev.target.value }).then(() => fetchSheet())} /></td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 text-sm text-slate-900">{e.grade_class === 0 && <span className="text-[10px] bg-amber-200 text-amber-800 px-1 py-0.5 rounded mr-1">ПКШ</span>}{e.group_name}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{e.children_count}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{e.grade_class === 0 ? 'ПКШ' : `${e.grade_class} кл.`}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{e.lessons_count}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{e.hours}</td>
                      <td className="px-4 py-3 text-sm text-slate-500">{e.lesson_dates}</td>
                    </>
                  )}
                  {isDraft && <td className="px-4 py-3 text-right"><button onClick={() => handleDeleteGrp(e.id)} className="text-xs text-red-500 hover:text-red-700">✕</button></td>}
                </tr>
              ))}
              {draftGrp.map((r, i) => (
                <tr key={`dg-${i}`} className="bg-emerald-50/50">
                  <td className="px-4 py-2"><input type="text" placeholder="Состав" className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm" value={r.group_name} onChange={(e) => updateDraftGrp(i, 'group_name', e.target.value)} /></td>
                  <td className="px-4 py-2"><input type="number" min="0" className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm" value={r.children_count} onChange={(e) => updateDraftGrp(i, 'children_count', e.target.value)} /></td>
                  <td className="px-4 py-2">
                    <input type="text" placeholder="1-11 или ПКШ" className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm" value={r.grade_class} onChange={(e) => updateDraftGrp(i, 'grade_class', e.target.value)} />
                  </td>
                  <td className="px-4 py-2"><input type="number" min="0" className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm" value={r.lessons_count} onChange={(e) => updateDraftGrp(i, 'lessons_count', e.target.value)} /></td>
                  <td className="px-4 py-2"><input type="number" step="0.01" min="0" className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm" value={r.hours} onChange={(e) => updateDraftGrp(i, 'hours', e.target.value)} /></td>
                  <td className="px-4 py-2"><input type="text" placeholder="01.03, 05.03" className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm" value={r.lesson_dates} onChange={(e) => updateDraftGrp(i, 'lesson_dates', e.target.value)} /></td>
                  <td className="px-4 py-2 text-right"><button onClick={() => setDraftGrp((p) => p.filter((_, j) => j !== i))} className="text-xs text-red-500">✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {grpEntries.length === 0 && draftGrp.length === 0 && <p className="text-center py-6 text-slate-400 text-sm">Нет записей</p>}
        {isDraft && (
          <div className="px-5 py-3 border-t border-slate-200 flex gap-2">
            <button onClick={() => setDraftGrp((p) => [...p, emptyGrp()])} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition">+ Добавить строку</button>
            {draftGrp.length > 0 && (
              <button onClick={saveGrpBatch} disabled={saving} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 transition">
                {saving ? 'Сохранение...' : 'Сохранить'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Totals */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-6">
        <h2 className="text-base font-semibold text-slate-900 mb-4">Итого</h2>
        <div className="space-y-2.5">
          <div className="flex justify-between py-1.5"><span className="text-sm text-slate-600">Итого к выдаче (основные):</span><span className="text-base font-bold text-slate-900">{fmt(totalBasic)}</span></div>
          <div className="border-t border-slate-100" />
          <div className="flex justify-between py-1"><span className="text-sm text-slate-500">Премиальные за индивидуальные:</span><span className="text-sm font-medium text-slate-700">{fmt(indTotalPrem)}</span></div>
          <div className="flex justify-between py-1"><span className="text-sm text-slate-500">Премиальные за группы:</span><span className="text-sm font-medium text-slate-700">{fmt(grpTotalPrem)}</span></div>
          <div className="flex justify-between py-1.5"><span className="text-sm font-medium text-slate-600">Премиальные всего:</span><span className="text-sm font-bold text-slate-900">{fmt(totalPrem)}</span></div>
          <div className="border-t border-slate-100" />
          <div className="flex justify-between py-1.5"><span className="text-sm font-medium text-slate-600">К отпускным добавится:</span><span className="text-sm font-bold text-slate-900">{fmt(totalVac)}</span></div>
          {advDebt > 0 && (
            <>
              <div className="border-t border-slate-100" />
              <div className="flex justify-between py-1.5"><span className="text-sm font-medium text-red-600">Долг по авансу:</span><span className="text-sm font-bold text-red-600">−{fmt(advDebt)}</span></div>
            </>
          )}
          {advAmount > 0 && (
            <div className="flex justify-between py-1.5"><span className="text-sm font-medium text-amber-600">Запрошенный аванс:</span><span className="text-sm font-bold text-amber-600">{fmt(advAmount)}</span></div>
          )}
          {advAmount > 0 && (
            <div className="flex justify-between py-1.5"><span className="text-sm text-amber-600">Аванс (вычитается из к выдаче):</span><span className="text-sm font-bold text-amber-600">−{fmt(advAmount)}</span></div>
          )}
          <div className="bg-indigo-50 rounded-xl px-4 py-3 -mx-1 mt-2">
            <div className="flex justify-between"><span className="text-sm font-semibold text-indigo-900">К выдаче:</span><span className="text-lg font-bold text-indigo-700">{fmt(totalBasic - advAmount)}</span></div>
          </div>
        </div>
      </div>

      {/* Advance */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-6">
        <h2 className="text-base font-semibold text-slate-900 mb-3">Аванс</h2>
        {advDebt > 0 ? (
          <p className="text-sm text-red-600 mb-3">Долг по авансу: {fmt(advDebt)}</p>
        ) : (
          <p className="text-sm text-emerald-600 mb-3">Нет долга по авансу</p>
        )}
        <div className="flex gap-2">
          <button onClick={() => setShowAdvModal('request')} className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-amber-600 hover:bg-amber-500 transition shadow-sm">Запросить аванс</button>
          <button onClick={() => setShowAdvModal('repay')} disabled={advDebt <= 0} className="px-4 py-2 rounded-xl text-sm font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 disabled:opacity-40 transition">Выплатить аванс</button>
        </div>
        {(sheet.advances || []).length > 0 && (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead><tr className="bg-slate-50"><th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Дата</th><th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Тип</th><th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Статус</th><th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Сумма</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {sheet.advances.map((a) => (
                  <tr key={a.id}>
                    <td className="px-3 py-2 text-slate-700">{format(new Date(a.date), 'd MMM yyyy', { locale: ru })}</td>
                    <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${a.advance_type === 'request' ? 'bg-amber-100 text-amber-700' : 'bg-teal-100 text-teal-700'}`}>{a.advance_type === 'request' ? 'Запрос' : 'Погашение'}</span></td>
                    <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${a.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : a.status === 'pending' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>{a.status === 'approved' ? 'Одобрен' : a.status === 'pending' ? 'Ожидает' : 'Отклонён'}</span></td>
                    <td className="px-3 py-2 font-medium text-slate-900">{fmt(parseFloat(a.amount))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Advance Modal */}
      {showAdvModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">{showAdvModal === 'request' ? 'Запросить аванс' : 'Выплатить аванс'}</h3>
            <p className="text-sm text-slate-500 mb-4">{showAdvModal === 'request' ? `Максимум: ${fmt(totalBasic)} (заработок по данному РЛ). Аванс будет вычтен из суммы к выдаче.` : `Максимум к погашению: ${fmt(advDebt)}.`}</p>
            <input type="number" step="0.01" min="0.01" max={showAdvModal === 'request' ? totalBasic : advDebt} className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm mb-4" value={advanceAmount} onChange={(e) => setAdvanceAmount(e.target.value)} autoFocus />
            <div className="flex gap-2">
              <button onClick={handleAdvance} disabled={!advanceAmount || parseFloat(advanceAmount) <= 0} className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition ${showAdvModal === 'request' ? 'bg-amber-600 hover:bg-amber-500' : 'bg-teal-600 hover:bg-teal-500'}`}>{showAdvModal === 'request' ? 'Запросить' : 'Выплатить'}</button>
              <button onClick={() => { setShowAdvModal(null); setAdvanceAmount('') }} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition">Отмена</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
