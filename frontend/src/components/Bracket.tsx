'use client'

import type { Match, PublicUser } from '@/lib/types'
import { fmtDate } from '@/lib/utils'
import { MatchCard } from './MatchCard'

export function Bracket({ matches, champion }: { matches: Match[]; champion: PublicUser | null }) {
  const semis = matches.filter((m) => m.stage === 'semifinal').sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0))
  const final = matches.find((m) => m.stage === 'final')
  if (!semis.length) {
    return <p className="text-sm text-muted-foreground">As semifinais serão definidas após a homologação da fase classificatória.</p>
  }
  return (
    <div className="grid items-center gap-4 md:grid-cols-[1fr_1fr_auto]">
      <div className="space-y-4">
        {semis.map((m) => <MatchCard key={m.id} match={m} />)}
      </div>
      <div>{final && <MatchCard match={final} />}</div>
      <div className="rounded-lg border bg-card p-4 text-center">
        <div className="text-xs uppercase text-muted-foreground">Campeão</div>
        <div className="mt-1 text-xl font-bold">{champion ? `👑 ${champion.display_name}` : '?'}</div>
        {final?.deadline && !champion && (
          <div className="mt-1 text-xs text-muted-foreground">Final até {fmtDate(final.deadline)}</div>
        )}
      </div>
    </div>
  )
}
