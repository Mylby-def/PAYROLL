import axios from 'axios'

function getCsrfToken(): string | null {
  const name = 'csrftoken'
  const cookies = document.cookie.split(';')
  for (const c of cookies) {
    const [key, value] = c.trim().split('=')
    if (key === name) return value ?? null
  }
  return null
}

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Отправляем CSRF-токен из cookie в заголовке (нужно для Django)
api.interceptors.request.use((config) => {
  const token = getCsrfToken()
  if (token) {
    config.headers.set('X-CSRFToken', token)
  }
  return config
})

// Добавляем interceptor для обработки ошибок
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Перенаправление на страницу входа при 401
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
