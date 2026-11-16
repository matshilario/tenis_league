'use client'

import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { api } from './api'

const KEY = 'liga.category'

/** Temporada atual + categoria escolhida (lembrada no navegador). */
export function useCategory() {
  const seasons = useQuery({ queryKey: ['seasons'], queryFn: api.seasons })
  const season = seasons.data?.find((s) => s.is_current) ?? seasons.data?.[0]
  const [chosen, setChosen] = useState<string | null>(null)

  useEffect(() => {
    try { setChosen(window.localStorage.getItem(KEY)) } catch { /* sem storage */ }
  }, [])

  const categories = season?.categories ?? []
  const categoryId = categories.find((c) => c.id === chosen)?.id ?? categories[0]?.id ?? null

  const detail = useQuery({
    queryKey: ['category', categoryId],
    queryFn: () => api.category(categoryId!),
    enabled: !!categoryId,
  })

  const choose = (id: string) => {
    setChosen(id)
    try { window.localStorage.setItem(KEY, id) } catch { /* sem storage */ }
  }

  return { seasons, season, categories, categoryId, choose, detail }
}
