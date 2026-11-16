'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { MatchCard } from '@/components/MatchCard'
import { ScoreForm, type ScorePayload } from '@/components/ScoreForm'
import { Button, ErrorBox, Field, Modal, Spinner, Textarea } from '@/components/ui'
import { api, errorMessage } from '@/lib/api'
import { useMe } from '@/lib/auth'
import type { Match } from '@/lib/types'

export default function MyMatches() {
  const me = useMe()
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['my-matches'], queryFn: api.myMatches })
  const [reporting, setReporting] = useState<Match | null>(null)
  const [contesting, setContesting] = useState<Match | null>(null)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['my-matches'] })
    qc.invalidateQueries({ queryKey: ['category'] })
  }
  const report = useMutation({
    mutationFn: (p: ScorePayload) => api.report(reporting!.id, {
      result_type: p.result_type as 'normal' | 'retired', score: p.score!,
      winner_side: p.winner_side, played_on: p.played_on,
    }),
    onSuccess: () => { setReporting(null); refresh() },
    onError: (e) => setError(errorMessage(e)),
  })
  const confirm = useMutation({
    mutationFn: (id: string) => api.confirm(id),
    onSuccess: refresh,
    onError: (e) => alert(errorMessage(e)),
  })
  const contest = useMutation({
    mutationFn: () => api.contest(contesting!.id, reason),
    onSuccess: () => { setContesting(null); setReason(''); refresh() },
    onError: (e) => setError(errorMessage(e)),
  })

  if (q.isLoading || !me.data) return <Spinner />
  const uid = me.data.id
  const matches = q.data ?? []
  const pending = matches.filter((m) => ['scheduled', 'interrupted', 'reported', 'contested'].includes(m.status))
  const done = matches.filter((m) => !pending.includes(m))

  const actions = (m: Match) => {
    const ready = m.player1 && m.player2
    if (['scheduled', 'interrupted'].includes(m.status) && ready) {
      return <Button size="sm" onClick={() => { setError(null); setReporting(m) }}>Lançar placar</Button>
    }
    if (m.status === 'reported' && m.reported_by_id !== uid) {
      return (
        <>
          <Button size="sm" onClick={() => confirm.mutate(m.id)} disabled={confirm.isPending}>Confirmar</Button>
          <Button size="sm" variant="secondary" onClick={() => { setError(null); setContesting(m) }}>Contestar</Button>
        </>
      )
    }
    return null
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Meus jogos</h1>
        <p className="text-sm text-muted-foreground">
          O vencedor lança o placar em até 24h. O adversário tem 48h para confirmar ou contestar;
          sem contestação, o resultado vale automaticamente (§10).
        </p>
      </div>

      <section>
        <h2 className="mb-2 font-semibold">Pendentes</h2>
        {pending.length === 0 ? <p className="text-sm text-muted-foreground">Nada pendente. 🎉</p> : (
          <div className="grid gap-3 sm:grid-cols-2">
            {pending.map((m) => <MatchCard key={m.id} match={m} highlight={uid}>{actions(m)}</MatchCard>)}
          </div>
        )}
      </section>

      {done.length > 0 && (
        <section>
          <h2 className="mb-2 font-semibold">Encerrados</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {done.map((m) => <MatchCard key={m.id} match={m} highlight={uid} />)}
          </div>
        </section>
      )}

      <Modal open={!!reporting} onClose={() => setReporting(null)} title="Lançar placar">
        {reporting && (
          <div className="space-y-3">
            <ErrorBox error={error} />
            <ScoreForm match={reporting} allowed={['normal', 'retired']} busy={report.isPending}
              onSubmit={(p) => { setError(null); report.mutate(p) }} />
            <p className="text-xs text-muted-foreground">W.O. é declarado pela organização. Partida interrompida por chuva? Avise a organização.</p>
          </div>
        )}
      </Modal>

      <Modal open={!!contesting} onClose={() => setContesting(null)} title="Contestar resultado">
        <div className="space-y-3">
          <p className="text-sm">Placar lançado: <b className="font-mono">{contesting?.score_text}</b></p>
          <Field label="O que está errado?">
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex.: o segundo set foi 6/4 para mim" />
          </Field>
          <ErrorBox error={error} />
          <Button className="w-full" disabled={contest.isPending || reason.trim().length < 3}
            onClick={() => contest.mutate()}>Enviar contestação</Button>
        </div>
      </Modal>
    </div>
  )
}
