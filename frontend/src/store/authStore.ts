import { create } from 'zustand'
import api from '../api/client'

interface User {
  id: number
  username: string
  email?: string
  first_name?: string
  last_name?: string
  role?: string
  city?: string
  city_id?: number
  balance?: string
  balance_premium?: string
  balance_vacation?: string
  teacher_id?: number | null
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
  refreshUser: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  login: async (username: string, password: string) => {
    await api.get('/auth/csrf/')
    const r = await api.post('/auth/login/', { username, password })
    set({ user: r.data.user, isAuthenticated: true })
  },
  logout: async () => {
    try { await api.post('/auth/logout/') } catch {}
    set({ user: null, isAuthenticated: false })
  },
  checkAuth: async () => {
    try {
      const r = await api.get('/auth/user/')
      set({ user: r.data, isAuthenticated: true })
    } catch { set({ user: null, isAuthenticated: false }) }
  },
  refreshUser: async () => {
    try {
      const r = await api.get('/auth/user/')
      set({ user: r.data })
    } catch {}
  },
}))
