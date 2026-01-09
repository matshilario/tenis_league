'use client'

import { create } from 'zustand'
import { Tenant } from '@/types'
import { tenantApi } from '@/lib/api'

interface TenantState {
  tenant: Tenant | null
  isLoading: boolean
  error: string | null
  fetchTenant: () => Promise<void>
  fetchTenantBySlug: (slug: string) => Promise<Tenant | null>
  setTenant: (tenant: Tenant | null) => void
}

export const useTenant = create<TenantState>((set) => ({
  tenant: null,
  isLoading: false,
  error: null,

  fetchTenant: async () => {
    set({ isLoading: true, error: null })
    try {
      const response = await tenantApi.getCurrent()
      set({ tenant: response.data, isLoading: false })
    } catch (error) {
      set({ error: 'Failed to fetch tenant', isLoading: false })
    }
  },

  fetchTenantBySlug: async (slug: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await tenantApi.getBySlug(slug)
      set({ tenant: response.data, isLoading: false })
      return response.data
    } catch (error) {
      set({ error: 'Tenant not found', isLoading: false })
      return null
    }
  },

  setTenant: (tenant) => set({ tenant }),
}))
