import { create } from 'zustand'
import api from '../api/client'

interface User {
  id: number
  username: string
  email?: string
  first_name?: string
  last_name?: string
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,

  login: async (username: string, password: string) => {
    try {
      await api.get('/auth/csrf/')
      const response = await api.post('/auth/login/', { username, password })
      const user = response.data.user
      set({ user, isAuthenticated: true })
    } catch (error) {
      throw error
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout/')
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      set({ user: null, isAuthenticated: false })
    }
  },

  checkAuth: async () => {
    try {
      const response = await api.get('/auth/user/')
      set({ user: response.data, isAuthenticated: true })
    } catch (error) {
      set({ user: null, isAuthenticated: false })
    }
  },
}))
