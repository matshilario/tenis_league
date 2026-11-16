'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Icon } from '@/components/Icon'
import { Badge, Button, Card, ErrorBox, Field, Input, Spinner, buttonClass } from '@/components/ui'
import { api, errorMessage } from '@/lib/api'
import type { Invite } from '@/lib/types'
import { fmtDate } from '@/lib/utils'

const whatsappLink = (url: string) =>
  'https://wa.me/?text=' + encodeURIComponent(`🎾 Bora pra Duvis Cup! Crie sua conta pelo convite: ${url}`)

export function InvitesTab() {
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['admin-invites'], queryFn: api.admin.invites })
  const [note, setNote] = useState('')
  const [uses, setUses] = useState(1)
  const [days, setDays] = useState(14)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [fresh, setFresh] = useState<Invite | null>(null)

  const create = useMutation({
    mutationFn: () => api.admin.createInvite({ note: note || undefined, max_uses: uses, expires_in_days: days }),
    onSuccess: (inv) => { setNote(''); setError(null); setFresh(inv); qc.invalidateQueries({ queryKey: ['admin-invites'] }); copy(inv.url, inv.id, true) },
    onError: (e) => setError(errorMessage(e)),
  })
  const revoke = useMutation({
    mutationFn: (id: string) => api.admin.revokeInvite(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-invites'] }),
  })

  /** Copia o link. Em navegadores que bloqueiam (ou travam) a cópia, o link continua
   *  visível na caixa "Convite gerado", então nunca dependemos só da área de transferência. */
  async function copy(url: string, id: string, silent = false) {
    try {
      await Promise.race([
        navigator.clipboard.writeText(url),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1500)),
      ])
      setCopied(id)
      setTimeout(() => setCopied(null), 2500)
    } catch {
      if (!silent) window.prompt('Copie o link:', url)
    }
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
        <p className="mt-2 text-xs text-muted-foreground">Quem se cadastrar pelo link fica pendente até você aprovar.</p>
        <ErrorBox error={error} />
      </Card>

      {fresh && (
        <Card className="border-lime bg-lime/10" aria-live="polite">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 font-display text-lg font-semibold">
              <Icon name="link" className="text-olive" /> Convite gerado{fresh.note ? ` — ${fresh.note}` : ''}
            </h3>
            <button onClick={() => setFresh(null)} className="text-muted-foreground hover:text-foreground" aria-label="Fechar">
              <Icon name="close" />
            </button>
          </div>
          <Input readOnly value={fresh.url} aria-label="Link do convite" onFocus={(e) => e.currentTarget.select()} className="font-mono text-sm" />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="primary" size="sm" onClick={() => copy(fresh.url, fresh.id)}>
              <Icon name="copy" className="h-4 w-4" /> {copied === fresh.id ? 'Copiado!' : 'Copiar'}
            </Button>
            <a href={whatsappLink(fresh.url)} target="_blank" rel="noopener noreferrer" className={buttonClass('accent', 'sm')}>
              <Icon name="chat" className="h-4 w-4" /> Enviar no WhatsApp
            </a>
          </div>
        </Card>
      )}

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
