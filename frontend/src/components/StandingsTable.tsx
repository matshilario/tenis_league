'use client'

import type { StandingRow } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Badge } from './ui'

const FORM_STYLE: Record<string, string> = {
  V: 'bg-green-600 text-white', D: 'bg-red-500 text-white', W: 'bg-zinc-500 text-white',
}

export function StandingsTable({ rows, title, highlight }: {
  rows: StandingRow[]; title?: string; highlight?: string
}) {
  return (
    <div>
      {title && <h3 className="mb-2 font-semibold">{title}</h3>}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-muted/60 text-xs text-muted-foreground">
            <tr>
              <th className="px-2 py-2 text-left">#</th>
              <th className="px-2 text-left">Jogador</th>
              <th className="px-2" title="Pontos">Pts</th>
              <th className="px-2" title="Jogos">J</th>
              <th className="px-2" title="Vitórias">V</th>
              <th className="px-2" title="Derrotas">D</th>
              <th className="px-2" title="Saldo de sets">SS</th>
              <th className="px-2" title="Saldo de games">SG</th>
              <th className="px-2" title="Derrotas por W.O.">WO</th>
              <th className="px-2 text-left">Últimos</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const out = r.entry_status !== 'active'
              return (
                <tr key={r.entry_id} className={cn('border-t',
                  r.qualifies && !out && 'bg-primary/5',
                  r.player.id === highlight && 'font-semibold',
                  out && 'text-muted-foreground line-through decoration-1')}>
                  <td className="px-2 py-2 tabular-nums">{r.position}</td>
                  <td className="px-2">
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="no-underline">{r.player.display_name}</span>
                      {r.needs_lottery && <Badge tone="warn">sorteio</Badge>}
                      {r.decided_by && <Badge title={`Desempate: ${r.decided_by}`}>{r.decided_by}</Badge>}
                      {!r.eligible_finals && r.entry_status === 'active' && <Badge tone="bad">inelegível</Badge>}
                      {out && <Badge tone="bad">{r.entry_status === 'excluded' ? 'excluído' : 'retirado'}</Badge>}
                    </div>
                  </td>
                  <td className="px-2 text-center font-bold tabular-nums">{r.points}</td>
                  <td className="px-2 text-center tabular-nums">{r.played}</td>
                  <td className="px-2 text-center tabular-nums">{r.wins}</td>
                  <td className="px-2 text-center tabular-nums">{r.losses}</td>
                  <td className="px-2 text-center tabular-nums">{r.sets_won - r.sets_lost}</td>
                  <td className="px-2 text-center tabular-nums">{r.games_won - r.games_lost}</td>
                  <td className="px-2 text-center tabular-nums">{r.wo_losses}</td>
                  <td className="px-2">
                    <div className="flex gap-0.5">
                      {r.form.map((f, i) => (
                        <span key={i} className={cn('inline-block h-5 w-5 rounded text-center text-[10px] leading-5', FORM_STYLE[f])}>
                          {f === 'W' ? 'WO' : f}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Vitória 10 · set 3 · game 1 (super tie-break vale set, não games). Destacados: vagas nas semifinais.
      </p>
    </div>
  )
}
