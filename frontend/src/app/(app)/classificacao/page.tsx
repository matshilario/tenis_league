'use client'

import { CategoryPicker } from '@/components/CategoryPicker'
import { MatchCard } from '@/components/MatchCard'
import { StandingsTable } from '@/components/StandingsTable'
import { Card, Spinner } from '@/components/ui'
import { useMe } from '@/lib/auth'
import { useCategory } from '@/lib/useCategory'
import { fmtDate } from '@/lib/utils'

export default function StandingsPage() {
  const me = useMe()
  const { categories, categoryId, choose, detail } = useCategory()
  if (detail.isLoading || !detail.data) return <Spinner />
  const d = detail.data
  const groupMatches = d.matches.filter((m) => m.stage === 'group')
  const rounds = Array.from(new Set(groupMatches.map((m) => m.round ?? 0))).sort((a, b) => a - b)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Classificação</h1>
        <CategoryPicker categories={categories} value={categoryId} onChange={choose} />
      </div>
      {d.category.homologated_at && (
        <Card className="text-sm">✅ Classificação homologada em {fmtDate(d.category.homologated_at)}.</Card>
      )}
      {d.groups.length === 0 && <Card>Os grupos ainda não foram sorteados.</Card>}
      {d.groups.map((g) => (
        <StandingsTable key={g.name} rows={g.rows} highlight={me.data?.id}
          title={d.groups.length > 1 ? `Grupo ${g.name}` : undefined} />
      ))}
      {rounds.map((r) => {
        const ms = groupMatches.filter((m) => m.round === r)
        return (
          <section key={r}>
            <h2 className="mb-2 font-semibold">Rodada {r} <span className="text-sm font-normal text-muted-foreground">até {fmtDate(ms[0]?.deadline, true)}</span></h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {ms.map((m) => <MatchCard key={m.id} match={m} nGroups={d.category.n_groups} highlight={me.data?.id} />)}
            </div>
          </section>
        )
      })}
      {d.category.makeup_deadline && (
        <p className="text-sm text-muted-foreground">Semana de reposição: até {fmtDate(d.category.makeup_deadline, true)}.</p>
      )}
    </div>
  )
}
