'use client'

import type { Match, PublicUser } from '@/lib/types'
import { fmtDate } from '@/lib/utils'
import { Icon } from './Icon'
import { MatchCard } from './MatchCard'
import { Empty } from './ui'

export function Bracket({ matches, champion }: { matches: Match[]; champion: PublicUser | null }) {
  const semis = matches.filter((m) => m.stage === 'semifinal').sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0))
  const final = matches.find((m) => m.stage === 'final')
  if (!semis.length) {
    return <Empty>As semifinais aparecem aqui depois da homologação da fase classificatória.</Empty>
  }
  return (
    <div className="grid items-center gap-5 lg:grid-cols-[1fr_1fr_0.8fr]">
      <div className="space-y-4">
        <p className="eyebrow">Semifinais{semis[0]?.deadline && ` · ${fmtDate(semis[0].deadline)}`}</p>
        {semis.map((m) => <MatchCard key={m.id} match={m} />)}
      </div>
      <div className="space-y-4">
        <p className="eyebrow">Final{final?.deadline && ` · ${fmtDate(final.deadline)}`}</p>
        {final && <MatchCard match={final} className="border-olive/50" />}
      </div>
      <div className="relative overflow-hidden rounded-lg border bg-court-deep p-6 text-center text-paper shadow-card dark:bg-court/25">
        <Icon name="crown" className="mx-auto h-10 w-10 text-lime" />
        <p className="eyebrow mt-3 text-lime/90 dark:text-lime">Campeão</p>
        <p className="mt-1 font-display text-2xl font-bold">{champion ? champion.display_name : 'Quem será?'}</p>
      </div>
    </div>
  )
}
