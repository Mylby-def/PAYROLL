import { useEffect, useState } from 'react'
import api from '../api/client'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

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
  effective_from: string
  effective_to: string | null
}

interface PkshPrice {
  id: number
  basic_rate: string
  premium_rate: string
  vacation_rate: string
  effective_from: string
  effective_to: string | null
}

interface Gap {
  gap_from: string
  gap_to: string
}

type PriceTab = 'individual' | 'group' | 'pksh'

const todayStr = () => new Date().toISOString().split('T')[0]

export default function RatesPage() {
  const [tab, setTab] = useState<PriceTab>('individual')
  const [individualPrices, setIndividualPrices] = useState<IndividualPrice[]>([])
  const [groupPrices, setGroupPrices] = useState<GroupPrice[]>([])
  const [pkshPrices, setPkshPrices] = useState<PkshPrice[]>([])
  const [individualGaps, setIndividualGaps] = useState<Gap[]>([])
  const [groupGaps, setGroupGaps] = useState<Gap[]>([])
  const [pkshGaps, setPkshGaps] = useState<Gap[]>([])
  const [loading, setLoading] = useState(true)

  const [showForm, setShowForm] = useState(false)
  const [indForm, setIndForm] = useState({ basic_rate: '', premium_rate: '', vacation_rate: '', effective_from: todayStr(), effective_to: '' })
  const [grpForm, setGrpForm] = useState({ class_from: '1', class_to: '4', basic_rate: '', premium_rate: '', vacation_rate: '', effective_from: todayStr(), effective_to: '' })
  const [pkshForm, setPkshForm] = useState({ basic_rate: '', premium_rate: '', vacation_rate: '', effective_from: todayStr(), effective_to: '' })

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    try {
      const [indRes, grpRes, pkshRes, indGapsRes, grpGapsRes, pkshGapsRes] = await Promise.all([
        api.get('/individual-prices/'),
        api.get('/group-prices/'),
        api.get('/pksh-prices/'),
        api.get('/individual-prices/check_gaps/'),
        api.get('/group-prices/check_gaps/'),
        api.get('/pksh-prices/check_gaps/'),
      ])
      setIndividualPrices(indRes.data.results || indRes.data)
      setGroupPrices(grpRes.data.results || grpRes.data)
      setPkshPrices(pkshRes.data.results || pkshRes.data)
      setIndividualGaps(indGapsRes.data.gaps || [])
      setGroupGaps(grpGapsRes.data.gaps || [])
      setPkshGaps(pkshGapsRes.data.gaps || [])
    } catch (error) {
      console.error('Error fetching prices:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (type: PriceTab, id: number) => {
    if (!confirm('Удалить эту цену?')) return
    try {
      const endpoint = type === 'individual' ? 'individual-prices' : type === 'group' ? 'group-prices' : 'pksh-prices'
      await api.delete(`/${endpoint}/${id}/`)
      fetchAll()
    } catch (error) {
      console.error('Error deleting price:', error)
    }
  }

  const handleSubmitIndividual = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/individual-prices/', {
        ...indForm,
        effective_to: indForm.effective_to || null,
      })
      setShowForm(false)
      setIndForm({ basic_rate: '', premium_rate: '', vacation_rate: '', effective_from: todayStr(), effective_to: '' })
      fetchAll()
    } catch (error) { console.error(error) }
  }

  const handleSubmitGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/group-prices/', {
        ...grpForm,
        class_from: parseInt(grpForm.class_from),
        class_to: parseInt(grpForm.class_to),
        effective_to: grpForm.effective_to || null,
      })
      setShowForm(false)
      setGrpForm({ class_from: '1', class_to: '4', basic_rate: '', premium_rate: '', vacation_rate: '', effective_from: todayStr(), effective_to: '' })
      fetchAll()
    } catch (error) { console.error(error) }
  }

  const handleSubmitPksh = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/pksh-prices/', {
        ...pkshForm,
        effective_to: pkshForm.effective_to || null,
      })
      setShowForm(false)
      setPkshForm({ basic_rate: '', premium_rate: '', vacation_rate: '', effective_from: todayStr(), effective_to: '' })
      fetchAll()
    } catch (error) { console.error(error) }
  }

  const formatCurrency = (val: string) =>
    parseFloat(val).toLocaleString('ru-RU', { style: 'currency', currency: 'RUB' })

  const formatDate = (d: string) => format(new Date(d), 'd MMM yyyy', { locale: ru })

  const currentGaps = tab === 'individual' ? individualGaps : tab === 'group' ? groupGaps : pkshGaps
  const tabLabel = tab === 'individual' ? 'индивидуальных занятий' : tab === 'group' ? 'групповых занятий' : 'ПКШ'

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400 text-sm">Загрузка...</div>

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Цены</h1>
          <p className="text-sm text-slate-500 mt-0.5">Тарифы на индивидуальные, групповые занятия и ПКШ</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/20 transition"
        >
          {showForm ? 'Отмена' : 'Добавить цену'}
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-2 mb-6">
        <nav className="flex gap-1">
          {([
            ['individual', 'Индивидуальные'],
            ['group', 'Групповые'],
            ['pksh', 'ПКШ'],
          ] as [PriceTab, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => { setTab(key); setShowForm(false) }}
              className={`flex-1 py-2.5 px-4 rounded-xl font-medium text-sm transition ${
                tab === key
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Gap warnings */}
      {currentGaps.length > 0 && (
        <div className="mb-6 space-y-2">
          {currentGaps.map((gap, i) => (
            <div key={i} className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl text-sm">
              С {formatDate(gap.gap_from)} по {formatDate(gap.gap_to)} у вас не выставлена цена за {tabLabel}, занятия за этот период не будут оплачиваться. Вы уверены?
            </div>
          ))}
        </div>
      )}

      {/* Create forms */}
      {showForm && tab === 'individual' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
          <h2 className="text-lg font-medium mb-4">Новая цена индивидуальных занятий</h2>
          <form onSubmit={handleSubmitIndividual}>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Основная цена</label>
                <input type="number" step="0.01" required className="block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" value={indForm.basic_rate} onChange={(e) => setIndForm({ ...indForm, basic_rate: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Премиальные</label>
                <input type="number" step="0.01" required className="block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" value={indForm.premium_rate} onChange={(e) => setIndForm({ ...indForm, premium_rate: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Отпускные</label>
                <input type="number" step="0.01" required className="block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" value={indForm.vacation_rate} onChange={(e) => setIndForm({ ...indForm, vacation_rate: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Действует с</label>
                <input type="date" required className="block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" value={indForm.effective_from} onChange={(e) => setIndForm({ ...indForm, effective_from: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Действует до</label>
                <input type="date" className="block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" value={indForm.effective_to} onChange={(e) => setIndForm({ ...indForm, effective_to: e.target.value })} />
              </div>
            </div>
            <button type="submit" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl shadow-sm text-white bg-indigo-600 hover:bg-indigo-700">Создать</button>
          </form>
        </div>
      )}

      {showForm && tab === 'group' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
          <h2 className="text-lg font-medium mb-4">Новая цена групповых занятий</h2>
          <form onSubmit={handleSubmitGroup}>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Класс от</label>
                <input type="number" min="0" required className="block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" value={grpForm.class_from} onChange={(e) => setGrpForm({ ...grpForm, class_from: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Класс до</label>
                <input type="number" min="0" required className="block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" value={grpForm.class_to} onChange={(e) => setGrpForm({ ...grpForm, class_to: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Основная цена</label>
                <input type="number" step="0.01" required className="block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" value={grpForm.basic_rate} onChange={(e) => setGrpForm({ ...grpForm, basic_rate: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Премиальные</label>
                <input type="number" step="0.01" required className="block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" value={grpForm.premium_rate} onChange={(e) => setGrpForm({ ...grpForm, premium_rate: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Отпускные</label>
                <input type="number" step="0.01" required className="block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" value={grpForm.vacation_rate} onChange={(e) => setGrpForm({ ...grpForm, vacation_rate: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Действует с</label>
                <input type="date" required className="block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" value={grpForm.effective_from} onChange={(e) => setGrpForm({ ...grpForm, effective_from: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Действует до</label>
                <input type="date" className="block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" value={grpForm.effective_to} onChange={(e) => setGrpForm({ ...grpForm, effective_to: e.target.value })} />
              </div>
            </div>
            <button type="submit" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl shadow-sm text-white bg-indigo-600 hover:bg-indigo-700">Создать</button>
          </form>
        </div>
      )}

      {showForm && tab === 'pksh' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
          <h2 className="text-lg font-medium mb-4">Новая цена ПКШ (подготовка к школе)</h2>
          <form onSubmit={handleSubmitPksh}>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Основная цена</label>
                <input type="number" step="0.01" required className="block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" value={pkshForm.basic_rate} onChange={(e) => setPkshForm({ ...pkshForm, basic_rate: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Премиальные</label>
                <input type="number" step="0.01" required className="block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" value={pkshForm.premium_rate} onChange={(e) => setPkshForm({ ...pkshForm, premium_rate: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Отпускные</label>
                <input type="number" step="0.01" required className="block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" value={pkshForm.vacation_rate} onChange={(e) => setPkshForm({ ...pkshForm, vacation_rate: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Действует с</label>
                <input type="date" required className="block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" value={pkshForm.effective_from} onChange={(e) => setPkshForm({ ...pkshForm, effective_from: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Действует до</label>
                <input type="date" className="block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" value={pkshForm.effective_to} onChange={(e) => setPkshForm({ ...pkshForm, effective_to: e.target.value })} />
              </div>
            </div>
            <button type="submit" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl shadow-sm text-white bg-indigo-600 hover:bg-indigo-700">Создать</button>
          </form>
        </div>
      )}

      {/* Tables */}
      {tab === 'individual' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Основная</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Премиальные</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Отпускные</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Период</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Действия</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {individualPrices.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{formatCurrency(p.basic_rate)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{formatCurrency(p.premium_rate)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{formatCurrency(p.vacation_rate)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {formatDate(p.effective_from)}{p.effective_to ? ` — ${formatDate(p.effective_to)}` : ' — ...'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <button onClick={() => handleDelete('individual', p.id)} className="text-red-600 hover:text-red-800">Удалить</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {individualPrices.length === 0 && <div className="text-center py-12 text-slate-400">Нет цен для индивидуальных занятий</div>}
        </div>
      )}

      {tab === 'group' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Классы</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Основная</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Премиальные</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Отпускные</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Период</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Действия</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {groupPrices.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{p.class_from}–{p.class_to} кл.</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{formatCurrency(p.basic_rate)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{formatCurrency(p.premium_rate)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{formatCurrency(p.vacation_rate)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {formatDate(p.effective_from)}{p.effective_to ? ` — ${formatDate(p.effective_to)}` : ' — ...'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <button onClick={() => handleDelete('group', p.id)} className="text-red-600 hover:text-red-800">Удалить</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {groupPrices.length === 0 && <div className="text-center py-12 text-slate-400">Нет цен для групповых занятий</div>}
        </div>
      )}

      {tab === 'pksh' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Основная</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Премиальные</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Отпускные</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Период</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Действия</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {pkshPrices.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{formatCurrency(p.basic_rate)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{formatCurrency(p.premium_rate)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{formatCurrency(p.vacation_rate)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {formatDate(p.effective_from)}{p.effective_to ? ` — ${formatDate(p.effective_to)}` : ' — ...'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <button onClick={() => handleDelete('pksh', p.id)} className="text-red-600 hover:text-red-800">Удалить</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pkshPrices.length === 0 && <div className="text-center py-12 text-slate-400">Нет цен ПКШ</div>}
        </div>
      )}
    </div>
  )
}
