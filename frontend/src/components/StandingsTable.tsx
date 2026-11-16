'use client'

import type { StandingRow } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Badge } from './ui'

const FORM: Record<string, [string, string]> = {
  V: ['bg-court text-paper', 'vitória'], D: ['bg-clay text-paper', 'derrota'], W: ['bg-muted-foreground text-paper', 'W.O.'],
}

const sign = (n: number) => (n > 0 ? `+${n}` : String(n))

export function StandingsTable({ rows, title, highlight, compact }: {
  rows: StandingRow[]; title?: string; highlight?: string; compact?: boolean
}) {
  return (
    <div>
      {title && <h3 className="mb-2 font-display text-lg font-semibold">{title}</h3>}
      <div className="overflow-x-auto rounded-lg border bg-card shadow-card">
        <table className={cn('w-full text-sm tabular', !compact && 'min-w-[600px]')}>
          <caption className="sr-only">Classificação{title ? ` — ${title}` : ''}</caption>
          <thead className="bg-olive-soft/70 text-left text-xs font-semibold text-ink/80 dark:text-foreground/80">
            <tr>
              <th scope="col" className="w-10 py-2.5 pl-3">#</th>
              <th scope="col" className="px-2">Jogador</th>
              <th scope="col" className="px-2 text-right" title="Pontos">Pts</th>
              {!compact && <>
                <th scope="col" className="px-2 text-center" title="Jogos">J</th>
                <th scope="col" className="px-2 text-center" title="Vitórias">V</th>
                <th scope="col" className="px-2 text-center" title="Derrotas">D</th>
                <th scope="col" className="px-2 text-center" title="Saldo de sets">SS</th>
                <th scope="col" className="px-2 text-center" title="Saldo de games">SG</th>
                <th scope="col" className="px-2 text-center" title="Derrotas por W.O.">WO</th>
                <th scope="col" className="px-2 pr-3">Últimos</th>
              </>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const out = r.entry_status !== 'active'
              const me = r.player.id === highlight
              return (
                <tr key={r.entry_id} className={cn('border-t',
                  me && 'bg-lime/15', out && 'text-muted-foreground')}>
                  <td className="py-2.5 pl-3">
                    <span className={cn('inline-flex h-6 w-6 items-center justify-center rounded-sm font-pixel text-xs',
                      r.position === 1 && !out ? 'bg-lime text-accent-foreground'
                        : r.qualifies && !out ? 'bg-olive-soft text-ink dark:text-foreground' : 'text-muted-foreground')}>
                      {r.position}
                    </span>
                  </td>
                  <td className="px-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={cn('font-semibold', out && 'line-through decoration-1')}>{r.player.display_name}</span>
                      {r.needs_lottery && <Badge tone="warn">sorteio</Badge>}
                      {r.decided_by && !compact && <Badge title={`Desempate: ${r.decided_by}`}>{r.decided_by}</Badge>}
                      {!r.eligible_finals && r.entry_status === 'active' && <Badge tone="bad">fora das finais</Badge>}
                      {out && <Badge tone="bad">{r.entry_status === 'excluded' ? 'excluído' : 'retirado'}</Badge>}
                    </div>
                  </td>
                  <td className="px-2 text-right font-display text-base font-bold text-ink dark:text-foreground">{r.points}</td>
                  {!compact && <>
                    <td className="px-2 text-center">{r.played}</td>
                    <td className="px-2 text-center">{r.wins}</td>
                    <td className="px-2 text-center">{r.losses}</td>
                    <td className="px-2 text-center">{sign(r.sets_won - r.sets_lost)}</td>
                    <td className="px-2 text-center">{sign(r.games_won - r.games_lost)}</td>
                    <td className="px-2 text-center">{r.wo_losses}</td>
                    <td className="px-2 pr-3">
                      <div className="flex gap-0.5">
                        {r.form.map((f, i) => (
                          <span key={i} title={FORM[f][1]} className={cn('inline-block h-5 min-w-5 rounded-sm px-0.5 text-center font-pixel text-[9px] leading-5', FORM[f][0])}>
                            {f === 'W' ? 'WO' : f}
                          </span>
                        ))}
                      </div>
                    </td>
                  </>}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {!compact && (
        <p className="mt-2 text-xs text-muted-foreground">
          Vitória 10 · set 3 · game 1 (super tie-break vale set, não games). Números em verde-oliva: vagas nas semifinais.
        </p>
      )}
    </div>
  )
}
