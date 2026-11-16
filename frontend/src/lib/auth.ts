'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api, tokenStore } from './api'

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: api.me,
    enabled: typeof window !== 'undefined' && !!tokenStore.get(),
    retry: false,
    staleTime: 5 * 60 * 1000,
  })
}

export function useLogout() {
  const qc = useQueryClient()
  return () => {
    tokenStore.clear()
    qc.clear()
    window.location.href = '/login'
  }
}
