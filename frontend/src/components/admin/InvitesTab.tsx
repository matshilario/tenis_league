'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Badge, Button, Card, ErrorBox, Field, Input, Spinner } from '@/components/ui'
import { api, errorMessage } from '@/lib/api'
import { fmtDate } from '@/lib/utils'

export function InvitesTab() {
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['admin-invites'], queryFn: api.admin.invites })
  const [note, setNote] = useState('')
  const [uses, setUses] = useState(1)
  const [days, setDays] = useState(14)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const create = useMutation({
    mutationFn: () => api.admin.createInvite({ note: note || undefined, max_uses: uses, expires_in_days: days }),
    onSuccess: (inv) => { setNote(''); qc.invalidateQueries({ queryKey: ['admin-invites'] }); copy(inv.url, inv.id) },
    onError: (e) => setError(errorMessage(e)),
  })
  const revoke = useMutation({
    mutationFn: (id: string) => api.admin.revokeInvite(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-invites'] }),
  })

  async function copy(url: string, id: string) {
    try { await navigator.clipboard.writeText(url); setCopied(id); setTimeout(() => setCopied(null), 2000) }
    catch { prompt('Copie o link:', url) }
  }

  return (
    <div className="space-y-5">
      <Card>
        <h2 className="mb-3 font-semibold">Novo convite</h2>
        <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end">
          <Field label="Para quem / nota"><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex.: Fulano do sábado" /></Field>
          <Field label="Usos"><Input type="number" min={1} max={50} value={uses} onChange={(e) => setUses(Number(e.target.value))} /></Field>
          <Field label="Validade (dias)"><Input type="number" min={1} max={365} value={days} onChange={(e) => setDays(Number(e.target.value))} /></Field>
          <Button onClick={() => create.mutate()} disabled={create.isPending}>Gerar link</Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">O link é copiado automaticamente. Quem se cadastrar fica pendente até você aprovar.</p>
        <ErrorBox error={error} />
      </Card>

      {q.isLoading ? <Spinner /> : (
        <div className="space-y-2">
          {(q.data ?? []).map((inv) => (
            <Card key={inv.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div className="min-w-0">
                <div className="font-medium">{inv.note || 'Sem nota'}</div>
                <div className="text-xs text-muted-foreground">
                  {inv.uses}/{inv.max_uses} usos · criado {fmtDate(inv.created_at)}
                  {inv.expires_at && ` · expira ${fmtDate(inv.expires_at)}`}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {inv.valid ? <Badge tone="good">válido</Badge> : <Badge>{inv.revoked ? 'cancelado' : 'encerrado'}</Badge>}
                {inv.valid && (
                  <>
                    <Button size="sm" variant="secondary" onClick={() => copy(inv.url, inv.id)}>
                      {copied === inv.id ? 'Copiado!' : 'Copiar link'}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => revoke.mutate(inv.id)}>Cancelar</Button>
                  </>
                )}
              </div>
            </Card>
          ))}
          {q.data?.length === 0 && <p className="text-sm text-muted-foreground">Nenhum convite ainda.</p>}
        </div>
      )}
    </div>
  )
}
