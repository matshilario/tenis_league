'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { User, Token } from '@/types'
import { authApi } from '@/lib/api'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  tenantSlug: string | null
  setUser: (user: User | null) => void
  setTenantSlug: (slug: string) => void
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  fetchUser: () => Promise<void>
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      tenantSlug: null,

      setUser: (user) => set({ user, isAuthenticated: !!user }),

      setTenantSlug: (slug) => {
        localStorage.setItem('tenant_slug', slug)
        set({ tenantSlug: slug })
      },

      login: async (email, password) => {
        set({ isLoading: true })
        try {
          const response = await authApi.login(email, password)
          const tokens: Token = response.data

          localStorage.setItem('access_token', tokens.access_token)
          localStorage.setItem('refresh_token', tokens.refresh_token)

          await get().fetchUser()
        } finally {
          set({ isLoading: false })
        }
      },

      logout: () => {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        set({ user: null, isAuthenticated: false })
      },

      fetchUser: async () => {
        set({ isLoading: true })
        try {
          const response = await authApi.me()
          set({ user: response.data, isAuthenticated: true })
        } catch {
          set({ user: null, isAuthenticated: false })
        } finally {
          set({ isLoading: false })
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ tenantSlug: state.tenantSlug }),
    }
  )
)
