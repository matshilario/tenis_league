'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { CategoryPicker } from '@/components/CategoryPicker'
import { Icon } from '@/components/Icon'
import { MatchCard } from '@/components/MatchCard'
import { RevealTitle, useStagger } from '@/components/RevealTitle'
import { StandingsTable } from '@/components/StandingsTable'
import { Card, Empty, Panel, Spinner, buttonClass } from '@/components/ui'
import { api } from '@/lib/api'
import { useMe } from '@/lib/auth'
import type { Match } from '@/lib/types'
import { useCategory } from '@/lib/useCategory'
import { PHASE, fmtDate, nameOr, stageLabel } from '@/lib/utils'

function opponentOf(m: Match, uid?: string) {
  return m.player1?.id === uid ? m.player2 : m.player1
}

export default function Home() {
  const me = useMe()
  const { season, categories, categoryId, choose, detail, seasons } = useCategory()
  const mine = useQuery({ queryKey: ['my-matches'], queryFn: api.myMatches })
  const stagger = useStagger(detail.data?.category.id)
  const uid = me.data?.id
  const first = me.data?.display_name.split(' ')[0] ?? ''

  const next = (mine.data ?? []).find((m) => ['scheduled', 'interrupted'].includes(m.status) && m.player1 && m.player2)
  const toConfirm = (mine.data ?? []).filter((m) => m.status === 'reported' && m.reported_by_id !== uid)
  const recent = (detail.data?.matches ?? [])
    .filter((m) => ['confirmed', 'reported'].includes(m.status))
    .sort((a, b) => (b.played_on ?? '').localeCompare(a.played_on ?? ''))
    .slice(0, 6)
  const d = detail.data
  const active = d?.entries.filter((e) => e.status === 'active').length ?? 0

  if (seasons.isLoading) return <Spinner />
  if (!season) {
    return (
      <div className="space-y-6">
        <RevealTitle text={`Bora pra quadra, ${first}?`} className="text-display font-bold" />
        <Empty>A organização ainda não abriu a primeira temporada. A quadra está sendo preparada.</Empty>
      </div>
    )
  }

  return (
    <div ref={stagger} className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-3 flex items-center gap-3">
            {season.name}{d && ` · ${PHASE[d.category.phase]}`}
            <span className="hidden h-px w-24 bg-olive/60 sm:block" aria-hidden="true" />
          </p>
          <RevealTitle text={d?.champion ? `${d.champion.display_name} é o campeão!` : `Bora pra quadra, ${first}?`}
            className="text-display font-bold text-ink dark:text-foreground" />
        </div>
        <CategoryPicker categories={categories} value={categoryId} onChange={choose} />
      </div>

      {toConfirm.length > 0 && (
        <Card data-reveal className="flex flex-wrap items-center justify-between gap-3 border-lime bg-lime/15">
          <p className="flex items-center gap-2 font-semibold">
            <Icon name="bell" className="text-olive" />
            {toConfirm.length === 1
              ? `${nameOr(opponentOf(toConfirm[0], uid))} lançou o placar de vocês. Confirma?`
              : `${toConfirm.length} resultados esperando sua confirmação.`}
          </p>
          <Link href="/jogos" className={buttonClass('primary', 'sm')}>Ver e confirmar</Link>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel data-reveal title="Seu próximo jogo" icon="calendar" tone="olive" className="lg:order-2"
          bodyClassName="flex min-h-[176px] flex-col items-center justify-center gap-3 text-center">
          {next ? (
            <>
              <p className="font-display text-2xl font-bold leading-tight sm:text-[1.7rem]">
                {first} <span className="font-normal text-muted-foreground">×</span> {nameOr(opponentOf(next, uid))}
              </p>
              <p className="text-sm font-semibold text-navy dark:text-[rgb(170_196_225)]">
                {stageLabel(next, d?.category.n_groups)} · até {fmtDate(next.deadline, true)}
                {next.status === 'interrupted' && ' · retomar'}
              </p>
              <Link href="/jogos" className={buttonClass('primary', 'md') + ' w-full'}>Lançar placar</Link>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              {d?.category.phase === 'registration' ? 'Os confrontos saem depois do sorteio.' : 'Nada marcado. Aproveita pra treinar o saque.'}
            </p>
          )}
        </Panel>

        <Panel data-reveal title="Ranking" icon="cup" className="lg:order-1" bodyClassName="p-0"
          action={<Link href="/classificacao" className="flex items-center gap-0.5 text-sm font-semibold text-navy hover:underline dark:text-[rgb(170_196_225)]">Ver todos <Icon name="arrowRight" className="h-4 w-4" /></Link>}>
          {d?.groups.length ? (
            <div className="[&>div>div]:rounded-none [&>div>div]:border-0 [&>div>div]:shadow-none">
              <StandingsTable compact highlight={uid} rows={d.groups[0].rows.slice(0, 5)} />
            </div>
          ) : <p className="p-4 text-sm text-muted-foreground">A tabela aparece depois do sorteio dos grupos.</p>}
        </Panel>

        <Panel data-reveal title={season.name} icon="flag" tone="soft" className="lg:order-3">
          <ul className="divide-y text-sm">
            <li className="flex items-center gap-3 py-2"><Icon name="ranking" className="text-navy" />{d ? PHASE[d.category.phase] : '—'}</li>
            <li className="flex items-center gap-3 py-2"><Icon name="users" className="text-navy" />{active} jogadores</li>
            <li className="flex items-center gap-3 py-2"><Icon name="layers" className="text-navy" />
              {d?.category.n_groups ? `${d.category.n_groups} grupo${d.category.n_groups > 1 ? 's' : ''}` : 'Grupos a sortear'}</li>
            {d?.category.makeup_deadline && (
              <li className="flex items-center gap-3 py-2"><Icon name="clock" className="text-navy" />Reposição até {fmtDate(d.category.makeup_deadline)}</li>
            )}
          </ul>
          <Link href="/jogos" className={buttonClass('accent', 'md') + ' mt-3 w-full'}>Registrar resultado</Link>
        </Panel>
      </div>

      {recent.length > 0 && (
        <section data-reveal>
          <h2 className="mb-3 font-display text-xl font-semibold">Últimos resultados</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((m) => <MatchCard key={m.id} match={m} nGroups={d?.category.n_groups} highlight={uid} />)}
          </div>
        </section>
      )}

      {season.announcement && (
        <section data-reveal className="rounded-lg border border-dashed border-olive/50 p-5">
          <p className="eyebrow mb-2">Comunicado da temporada</p>
          <p className="whitespace-pre-line text-[15px]">{season.announcement}</p>
        </section>
      )}
    </div>
  )
}
