'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { CategoryPicker } from '@/components/CategoryPicker'
import { MatchCard } from '@/components/MatchCard'
import { PixelBanner } from '@/components/PixelBanner'
import { StandingsTable } from '@/components/StandingsTable'
import { Card, Spinner } from '@/components/ui'
import { api } from '@/lib/api'
import { useMe } from '@/lib/auth'
import { useCategory } from '@/lib/useCategory'
import { PHASE, fmtDate } from '@/lib/utils'

export default function Home() {
  const me = useMe()
  const { season, categories, categoryId, choose, detail, seasons } = useCategory()
  const mine = useQuery({ queryKey: ['my-matches'], queryFn: api.myMatches })

  const todo = (mine.data ?? []).filter((m) =>
    ['scheduled', 'interrupted'].includes(m.status) && m.player1 && m.player2)
  const toConfirm = (mine.data ?? []).filter((m) =>
    m.status === 'reported' && m.reported_by_id !== me.data?.id)
  const recent = (detail.data?.matches ?? [])
    .filter((m) => ['confirmed', 'reported'].includes(m.status))
    .sort((a, b) => (b.played_on ?? '').localeCompare(a.played_on ?? ''))
    .slice(0, 6)

  return (
    <div className="space-y-6">
      <PixelBanner />

      {seasons.isLoading ? <Spinner /> : !season ? (
        <Card>Nenhuma temporada criada ainda.</Card>
      ) : (
        <>
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h1 className="text-2xl font-bold">{season.name}</h1>
              {detail.data && (
                <p className="text-sm text-muted-foreground">
                  {PHASE[detail.data.category.phase]}
                  {detail.data.category.start_date && ` · início ${fmtDate(detail.data.category.start_date)}`}
                </p>
              )}
            </div>
            <CategoryPicker categories={categories} value={categoryId} onChange={choose} />
          </div>

          {detail.data?.champion && (
            <Card className="text-center text-lg">👑 Campeão: <b>{detail.data.champion.display_name}</b></Card>
          )}

          {toConfirm.length > 0 && (
            <section>
              <h2 className="mb-2 font-semibold">⚠️ Confirme ou conteste</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {toConfirm.map((m) => <MatchCard key={m.id} match={m} highlight={me.data?.id} />)}
              </div>
              <Link href="/jogos" className="mt-2 inline-block text-sm underline">Ir para meus jogos →</Link>
            </section>
          )}

          {todo.length > 0 && (
            <section>
              <h2 className="mb-2 font-semibold">Seus próximos jogos</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {todo.slice(0, 4).map((m) => (
                  <MatchCard key={m.id} match={m} highlight={me.data?.id} nGroups={detail.data?.category.n_groups} />
                ))}
              </div>
            </section>
          )}

          {detail.data?.groups.map((g) => (
            <StandingsTable key={g.name} rows={g.rows} highlight={me.data?.id}
              title={detail.data!.groups.length > 1 ? `Grupo ${g.name}` : 'Classificação'} />
          ))}

          {recent.length > 0 && (
            <section>
              <h2 className="mb-2 font-semibold">Últimos resultados</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {recent.map((m) => <MatchCard key={m.id} match={m} nGroups={detail.data?.category.n_groups} />)}
              </div>
            </section>
          )}

          {season.announcement && (
            <Card>
              <h2 className="mb-1 font-semibold">Comunicado da temporada</h2>
              <p className="whitespace-pre-line text-sm">{season.announcement}</p>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
