'use client'

import { useQuery } from '@tanstack/react-query'
import { api, apiUrl } from '@/lib/api'
import type { PublicSponsor } from '@/lib/types'
import { cn } from '@/lib/utils'

const link = (s: PublicSponsor) =>
  s.website ? (s.website.startsWith('http') ? s.website : `https://${s.website}`)
    : s.instagram ? `https://instagram.com/${s.instagram}` : null

/** Logos dos patrocinadores; o tamanho acompanha o peso da cota. */
export function SponsorLogos({ sponsors, size = 'md', className }: {
  sponsors: PublicSponsor[]; size?: 'sm' | 'md' | 'lg'; className?: string
}) {
  const h = (w: number) => {
    const base = size === 'sm' ? 22 : size === 'lg' ? 52 : 34
    return Math.round(base * (w >= 3 ? 1.5 : w === 2 ? 1.2 : 1))
  }
  return (
    <ul className={cn('flex flex-wrap items-center gap-x-6 gap-y-3', className)}>
      {sponsors.map((s) => {
        const href = link(s)
        const img = s.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <span className="inline-flex rounded-md bg-[#fcf8ee] px-2 py-1.5 ring-1 ring-black/5">
            <img src={apiUrl(s.logo_url)!} alt={s.company} loading="lazy"
              style={{ height: h(s.weight) }} className="w-auto max-w-[180px] object-contain" />
          </span>
        ) : <span className="font-semibold">{s.company}</span>
        return (
          <li key={s.id}>
            {href ? <a href={href} target="_blank" rel="noopener noreferrer sponsored" title={s.company}
              className="block rounded-sm opacity-90 transition-opacity hover:opacity-100">{img}</a> : img}
          </li>
        )
      })}
    </ul>
  )
}

/**
 * Faixa "Parafusos apertados por" — estampa o site com as logos dentro do prazo de
 * exibição de cada cota. Não aparece nada quando não há patrocinador ativo.
 */
export function SponsorBar({ className }: { className?: string }) {
  const q = useQuery({ queryKey: ['sponsors-active'], queryFn: api.activeSponsors, staleTime: 300_000 })
  const list = q.data ?? []
  if (!list.length) return null
  const master = list.find((s) => s.weight >= 3)
  return (
    <aside aria-label="Patrocinadores" className={cn('rounded-lg border border-dashed border-olive/40 px-4 py-3', className)}>
      <p className="mb-2 font-pixel text-[11px] uppercase tracking-wider text-muted-foreground">
        {master ? `Duvis Cup apresentada por ${master.company} · ` : ''}Parafusos apertados por
      </p>
      <SponsorLogos sponsors={list} size="sm" />
    </aside>
  )
}
