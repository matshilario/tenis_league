'use client'

import { CategoryPicker } from '@/components/CategoryPicker'
import { Icon } from '@/components/Icon'
import { MatchCard } from '@/components/MatchCard'
import { StandingsTable } from '@/components/StandingsTable'
import { PageHeader } from '@/components/PageHeader'
import { Card, Empty, Spinner } from '@/components/ui'
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
      <PageHeader eyebrow={`${d.season.name} · ${d.category.name}`} title="Classificação">
        <CategoryPicker categories={categories} value={categoryId} onChange={choose} />
      </PageHeader>
      {d.category.homologated_at && (
        <Card className="flex items-center gap-2 text-sm"><Icon name="check" className="text-court" /> Classificação homologada em {fmtDate(d.category.homologated_at)}.</Card>
      )}
      {d.groups.length === 0 && <Empty>Os grupos ainda não foram sorteados.</Empty>}
      {d.groups.map((g) => (
        <StandingsTable key={g.name} rows={g.rows} highlight={me.data?.id}
          title={d.groups.length > 1 ? `Grupo ${g.name}` : undefined} />
      ))}
      {rounds.map((r) => {
        const ms = groupMatches.filter((m) => m.round === r)
        return (
          <section key={r}>
            <h2 className="mb-3 flex items-baseline gap-3 font-display text-xl font-semibold">Rodada {r} <span className="eyebrow">até {fmtDate(ms[0]?.deadline, true)}</span></h2>
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
