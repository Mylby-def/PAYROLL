import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'

interface Stats {
  total_sheets: number
  draft_sheets: number
  submitted_sheets: number
  approved_sheets: number
  total_amount: number
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [sheetsRes] = await Promise.all([
          api.get('/payroll-sheets/'),
        ])
        
        const sheets = sheetsRes.data.results || sheetsRes.data
        const total = sheets.reduce((sum: number, sheet: any) => sum + (parseFloat(sheet.total_amount) || 0), 0)
        
        setStats({
          total_sheets: sheets.length,
          draft_sheets: sheets.filter((s: any) => s.status === 'draft').length,
          submitted_sheets: sheets.filter((s: any) => s.status === 'submitted').length,
          approved_sheets: sheets.filter((s: any) => s.status === 'approved').length,
          total_amount: total,
        })
      } catch (error) {
        console.error('Error fetching stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) {
    return <div className="text-center py-12">Загрузка...</div>
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Дашборд</h1>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="text-2xl font-bold text-gray-900">
                  {stats?.total_sheets || 0}
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Всего расчётных листов
                  </dt>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="text-2xl font-bold text-yellow-600">
                  {stats?.draft_sheets || 0}
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Черновики
                  </dt>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="text-2xl font-bold text-blue-600">
                  {stats?.submitted_sheets || 0}
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Отправлено
                  </dt>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="text-2xl font-bold text-green-600">
                  {stats?.approved_sheets || 0}
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Утверждено
                  </dt>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Общая сумма</h2>
        <p className="text-3xl font-bold text-indigo-600">
          {stats?.total_amount.toLocaleString('ru-RU', {
            style: 'currency',
            currency: 'RUB',
          }) || '0 ₽'}
        </p>
      </div>

      <div className="mt-8">
        <Link
          to="/payroll-sheets"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
        >
          Перейти к расчётным листам
        </Link>
      </div>
    </div>
  )
}
