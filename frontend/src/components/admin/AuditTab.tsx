'use client'

import { useQuery } from '@tanstack/react-query'
import { Spinner } from '@/components/ui'
import { api } from '@/lib/api'
import { fmtDateTime } from '@/lib/utils'

export function AuditTab() {
  const q = useQuery({ queryKey: ['admin-audit'], queryFn: api.admin.audit })
  if (q.isLoading) return <Spinner />
  return (
    <ul className="divide-y rounded-lg border text-sm">
      {(q.data ?? []).map((a) => (
        <li key={a.id} className="flex gap-3 px-3 py-2">
          <span className="w-28 shrink-0 text-xs text-muted-foreground">{fmtDateTime(a.created_at)}</span>
          <span>{a.summary}</span>
        </li>
      ))}
      {q.data?.length === 0 && <li className="p-3 text-muted-foreground">Sem registros.</li>}
    </ul>
  )
}
