'use client'

import type { Match, MatchStatus } from '@/lib/types'
import { MATCH_STATUS, cn, fmtDate, fmtDateTime, nameOr, stageLabel } from '@/lib/utils'
import { Badge } from './ui'

const TONE: Record<MatchStatus, 'neutral' | 'good' | 'warn' | 'bad' | 'info'> = {
  scheduled: 'neutral', reported: 'info', contested: 'bad', confirmed: 'good',
  interrupted: 'warn', annulled: 'bad', bye: 'neutral',
}

export function MatchCard({ match, nGroups, highlight, children }: {
  match: Match; nGroups?: number | null; highlight?: string; children?: React.ReactNode
}) {
  const w = match.winner_side
  const row = (side: 1 | 2) => {
    const p = side === 1 ? match.player1 : match.player2
    const won = w === side && ['confirmed', 'reported', 'bye'].includes(match.status)
    return (
      <div className={cn('flex items-center justify-between gap-2',
        won && 'font-semibold', p?.id === highlight && 'text-primary')}>
        <span className="truncate">{nameOr(p, match.stage === 'group' ? '—' : 'A definir')}</span>
        {won && <span aria-label="vencedor">🏆</span>}
      </div>
    )
  }
  return (
    <div className={cn('rounded-lg border bg-card p-3 text-sm',
      match.status === 'annulled' && 'opacity-60')}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-1 text-xs text-muted-foreground">
        <span>{stageLabel(match, nGroups)}{match.deadline && ` · até ${fmtDate(match.deadline, true)}`}</span>
        <Badge tone={TONE[match.status]}>{MATCH_STATUS[match.status]}</Badge>
      </div>
      <div className="space-y-1">
        {row(1)}
        {row(2)}
      </div>
      {match.score_text && (
        <div className="mt-2 font-mono text-sm tabular-nums">{match.score_text}</div>
      )}
      {match.status === 'reported' && match.contest_deadline && (
        <div className="mt-1 text-xs text-muted-foreground">
          Contestação até {fmtDateTime(match.contest_deadline)}
        </div>
      )}
      {match.status === 'contested' && match.contest_reason && (
        <div className="mt-1 text-xs text-destructive">Contestação: {match.contest_reason}</div>
      )}
      {match.note && <div className="mt-1 text-xs text-muted-foreground">{match.note}</div>}
      {children && <div className="mt-3 flex flex-wrap gap-2">{children}</div>}
    </div>
  )
}
