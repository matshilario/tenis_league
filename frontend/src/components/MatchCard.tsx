'use client'

import type { Match, MatchStatus, Score } from '@/lib/types'
import { MATCH_STATUS, cn, fmtDate, fmtDateTime, nameOr, stageLabel } from '@/lib/utils'
import { Icon } from './Icon'
import { Badge } from './ui'

const TONE: Record<MatchStatus, 'neutral' | 'good' | 'warn' | 'bad' | 'info'> = {
  scheduled: 'neutral', reported: 'info', contested: 'bad', confirmed: 'good',
  interrupted: 'warn', annulled: 'bad', bye: 'neutral',
}

/** Games de cada lado por set, para o placar em colunas. */
function columns(score: Score | null, side: 0 | 1): (number | string)[] {
  if (!score) return []
  const cols: (number | string)[] = score.sets.map((s) => s[side])
  if (score.super_tiebreak) cols.push(score.super_tiebreak[side])
  else if (score.stb_awarded) cols.push('·')
  return cols
}

export function MatchCard({ match, nGroups, highlight, children, className }: {
  match: Match; nGroups?: number | null; highlight?: string; children?: React.ReactNode; className?: string
}) {
  const w = match.winner_side
  const showScore = ['confirmed', 'reported', 'contested'].includes(match.status) && match.score
  const special = match.result_type === 'walkover' ? 'W.O.' : match.result_type === 'retired' ? 'abandono'
    : match.result_type === 'double_walkover' ? 'W.O. duplo' : null

  const row = (side: 1 | 2) => {
    const p = side === 1 ? match.player1 : match.player2
    const won = w === side && ['confirmed', 'reported', 'bye'].includes(match.status)
    const lost = w !== null && w !== side && ['confirmed', 'reported'].includes(match.status)
    const cols = showScore ? columns(match.score, side === 1 ? 0 : 1) : []
    return (
      <div className={cn('flex items-center gap-2 py-1', lost && 'text-muted-foreground')}>
        <span className={cn('h-2 w-2 shrink-0 rounded-full', won ? 'bg-lime ring-2 ring-lime/30' : 'bg-transparent')} aria-hidden="true" />
        <span className={cn('min-w-0 flex-1 truncate', won && 'font-bold', p?.id === highlight && 'text-court underline decoration-lime decoration-2 underline-offset-4')}>
          {nameOr(p, match.stage === 'group' ? '—' : 'A definir')}
        </span>
        {won && <span className="sr-only">(vencedor)</span>}
        <span className="flex gap-1 font-pixel text-sm tabular">
          {cols.map((c, i) => (
            <span key={i} className={cn('w-6 rounded-sm text-center',
              i === 2 ? 'bg-muted' : '',
              won ? 'text-ink dark:text-foreground' : '')}>{c}</span>
          ))}
        </span>
      </div>
    )
  }

  return (
    <article className={cn('rounded-lg border bg-card p-3 shadow-card', match.status === 'annulled' && 'opacity-60', className)}
      aria-label={`${nameOr(match.player1)} contra ${nameOr(match.player2)}: ${MATCH_STATUS[match.status]}${match.score_text ? `, ${match.score_text}` : ''}`}>
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-1">
        <span className="eyebrow text-[10px]">
          {stageLabel(match, nGroups)}{match.deadline && match.status !== 'confirmed' && ` · até ${fmtDate(match.deadline)}`}
        </span>
        <span className="flex items-center gap-1">
          {showScore && match.player1 && match.player2 && (
            <a href={`/compartilhar/jogo/${match.id}`} target="_blank" rel="noopener noreferrer"
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-court"
              aria-label="Compartilhar placar" title="Compartilhar placar">
              <Icon name="share" className="h-4 w-4" />
            </a>
          )}
          {special && <Badge tone="warn">{special}</Badge>}
          <Badge tone={TONE[match.status]}>{MATCH_STATUS[match.status]}</Badge>
        </span>
      </div>
      <div className="divide-y divide-border/70">
        {row(1)}
        {row(2)}
      </div>
      {match.status === 'reported' && match.contest_deadline && (
        <p className="mt-2 text-xs text-muted-foreground">Contestação até {fmtDateTime(match.contest_deadline)}</p>
      )}
      {match.status === 'contested' && match.contest_reason && (
        <p className="mt-2 text-xs text-destructive">Contestação: {match.contest_reason}</p>
      )}
      {match.note && <p className="mt-2 text-xs text-muted-foreground">{match.note}</p>}
      {children && <div className="mt-3 flex flex-wrap gap-2">{children}</div>}
    </article>
  )
}
