import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import api from '../api/client'

interface PayrollSheet {
  id: number
  title: string
  teacher_name?: string
  period_start: string
  period_end: string
  status: string
  total_amount: string
  entries_count: number
  created_at: string
}

export default function PayrollSheetsPage() {
  const [sheets, setSheets] = useState<PayrollSheet[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSheets()
  }, [])

  const fetchSheets = async () => {
    try {
      const response = await api.get('/payroll-sheets/')
      setSheets(response.data.results || response.data)
    } catch (error) {
      console.error('Error fetching sheets:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-yellow-100 text-yellow-800'
      case 'submitted':
        return 'bg-blue-100 text-blue-800'
      case 'approved':
        return 'bg-green-100 text-green-800'
      case 'paid':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft':
        return 'Черновик'
      case 'submitted':
        return 'Отправлен'
      case 'approved':
        return 'Утверждён'
      case 'paid':
        return 'Оплачен'
      default:
        return status
    }
  }

  const handleDelete = async (e: React.MouseEvent, sheetId: number) => {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm('Удалить этот расчётный лист?')) return
    try {
      await api.delete(`/payroll-sheets/${sheetId}/`)
      fetchSheets()
    } catch (err) {
      console.error('Error deleting sheet:', err)
    }
  }

  if (loading) {
    return <div className="text-center py-12">Загрузка...</div>
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Расчётные листы</h1>
        <Link
          to="/payroll-sheets/new"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
        >
          Создать новый
        </Link>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {sheets.map((sheet) => (
            <li key={sheet.id} className="hover:bg-gray-50">
              <div className="px-4 py-4 sm:px-6 flex items-center justify-between gap-4">
                <Link to={`/payroll-sheets/${sheet.id}`} className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center min-w-0">
                      <p className="text-sm font-medium text-indigo-600 truncate">
                        {sheet.title}
                      </p>
                      <span
                        className={`ml-3 flex-shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                          sheet.status
                        )}`}
                      >
                        {getStatusText(sheet.status)}
                      </span>
                    </div>
                    <div className="ml-2 flex-shrink-0 flex">
                      <p className="text-sm text-gray-900 font-semibold">
                        {parseFloat(sheet.total_amount || '0').toLocaleString('ru-RU', {
                          style: 'currency',
                          currency: 'RUB',
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 sm:flex sm:justify-between">
                    <div className="sm:flex">
                      <p className="flex items-center text-sm text-gray-500">
                        {format(new Date(sheet.period_start), 'd MMM yyyy', {
                          locale: ru,
                        })}{' '}
                        -{' '}
                        {format(new Date(sheet.period_end), 'd MMM yyyy', {
                          locale: ru,
                        })}
                      </p>
                      <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                        Записей: {sheet.entries_count}
                      </p>
                    </div>
                    <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                      <p>
                        Создан:{' '}
                        {format(new Date(sheet.created_at), 'd MMM yyyy', {
                          locale: ru,
                        })}
                      </p>
                    </div>
                  </div>
                </Link>
                {sheet.status === 'draft' && (
                  <button
                    type="button"
                    onClick={(e) => handleDelete(e, sheet.id)}
                    className="flex-shrink-0 px-3 py-1.5 text-sm font-medium text-red-700 hover:text-red-800 border border-red-200 rounded-md hover:bg-red-50"
                  >
                    Удалить
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
        {sheets.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            Нет расчётных листов. Создайте первый!
          </div>
        )}
      </div>
    </div>
  )
}
