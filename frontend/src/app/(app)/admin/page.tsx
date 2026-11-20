'use client'

import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { AuditTab } from '@/components/admin/AuditTab'
import { InvitesTab } from '@/components/admin/InvitesTab'
import { MatchesTab } from '@/components/admin/MatchesTab'
import { MembersTab } from '@/components/admin/MembersTab'
import { SeasonTab } from '@/components/admin/SeasonTab'
import { SponsorTab } from '@/components/admin/SponsorTab'
import { PageHeader } from '@/components/PageHeader'
import { Card } from '@/components/ui'
import { api } from '@/lib/api'
import { useMe } from '@/lib/auth'
import { cn } from '@/lib/utils'

const TABS = [
  { id: 'members', label: 'Membros' },
  { id: 'invites', label: 'Convites' },
  { id: 'season', label: 'Temporada' },
  { id: 'matches', label: 'Partidas' },
  { id: 'patrocinio', label: 'Patrocínio' },
  { id: 'audit', label: 'Histórico' },
] as const
type Tab = (typeof TABS)[number]['id']

export default function AdminPage() {
  const me = useMe()
  const aba = useSearchParams().get('aba')
  const [tab, setTab] = useState<Tab>(TABS.some((t) => t.id === aba) ? (aba as Tab) : 'members')
  const pendingUsers = useQuery({ queryKey: ['admin-users', 'pending'], queryFn: () => api.admin.users('pending'),
    enabled: me.data?.role === 'admin' })
  const pendingMatches = useQuery({ queryKey: ['admin-pending-matches'], queryFn: api.admin.pendingMatches,
    enabled: me.data?.role === 'admin' })

  if (me.data?.role !== 'admin') return <Card>Acesso restrito à organização.</Card>
  const badge: Partial<Record<Tab, number>> = {
    members: pendingUsers.data?.length, matches: pendingMatches.data?.length,
  }

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Só a organização vê" title="Painel da organização" />
      <div className="flex gap-1 overflow-x-auto border-b" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
            className={cn('-mb-px whitespace-nowrap border-b-[3px] px-3 py-2.5 text-[15px] font-semibold',
              tab === t.id ? 'border-lime text-ink dark:text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground')}>
            {t.label}
            {!!badge[t.id] && <span className="ml-1 rounded-full bg-destructive px-1.5 text-xs text-destructive-foreground">{badge[t.id]}</span>}
          </button>
        ))}
      </div>
      {tab === 'members' && <MembersTab />}
      {tab === 'invites' && <InvitesTab />}
      {tab === 'season' && <SeasonTab />}
      {tab === 'matches' && <MatchesTab />}
      {tab === 'patrocinio' && <SponsorTab />}
      {tab === 'audit' && <AuditTab />}
    </div>
  )
}
