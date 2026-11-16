'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { CategoryPicker } from '@/components/CategoryPicker'
import { MatchCard } from '@/components/MatchCard'
import { ScoreForm } from '@/components/ScoreForm'
import { Button, ErrorBox, Field, Input, Modal, Select, Spinner, Textarea } from '@/components/ui'
import { api, errorMessage } from '@/lib/api'
import type { Match } from '@/lib/types'
import { useCategory } from '@/lib/useCategory'
import { nameOr } from '@/lib/utils'

type Filter = 'attention' | 'open' | 'all'

export function MatchesTab() {
  const { categories, categoryId, choose, detail } = useCategory()
  const pending = useQuery({ queryKey: ['admin-pending-matches'], queryFn: api.admin.pendingMatches })
  const [filter, setFilter] = useState<Filter>('attention')
  const [editing, setEditing] = useState<Match | null>(null)

  if (detail.isLoading || !detail.data) return <Spinner />
  const d = detail.data
  const all = d.matches
  const shown = filter === 'attention'
    ? all.filter((m) => ['contested', 'interrupted', 'reported'].includes(m.status))
    : filter === 'open'
      ? all.filter((m) => ['scheduled', 'interrupted', 'contested', 'reported'].includes(m.status))
      : all

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <CategoryPicker categories={categories} value={categoryId} onChange={choose} />
        <Select className="w-auto" value={filter} onChange={(e) => setFilter(e.target.value as Filter)}>
          <option value="attention">Precisam de atenção</option>
          <option value="open">Em aberto</option>
          <option value="all">Todas</option>
        </Select>
      </div>
      {!!pending.data?.length && filter !== 'attention' && (
        <p className="text-sm text-destructive">{pending.data.length} partida(s) contestada(s)/interrompida(s) aguardando decisão.</p>
      )}
      {shown.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma partida neste filtro.</p>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((m) => (
          <MatchCard key={m.id} match={m} nGroups={d.category.n_groups}>
            {m.status !== 'bye' && <Button size="sm" variant="secondary" onClick={() => setEditing(m)}>Editar</Button>}
          </MatchCard>
        ))}
      </div>
      {editing && <EditMatch match={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

type Action = 'result' | 'interrupted' | 'annulled' | 'scheduled' | 'deadline'

function EditMatch({ match, onClose }: { match: Match; onClose: () => void }) {
  const qc = useQueryClient()
  const ready = !!(match.player1 && match.player2)
  const [action, setAction] = useState<Action>(ready ? 'result' : 'deadline')
  const [note, setNote] = useState(match.note ?? '')
  const [deadline, setDeadline] = useState(match.deadline ?? '')
  const [error, setError] = useState<string | null>(null)
  const isGroup = match.stage === 'group'

  const done = () => {
    qc.invalidateQueries({ queryKey: ['category'] })
    qc.invalidateQueries({ queryKey: ['admin-pending-matches'] })
    qc.invalidateQueries({ queryKey: ['my-matches'] })
    onClose()
  }
  const save = useMutation({
    mutationFn: (body: Parameters<typeof api.admin.setMatch>[1]) => api.admin.setMatch(match.id, body),
    onSuccess: done,
    onError: (e) => setError(errorMessage(e)),
  })
  const saveDeadline = useMutation({
    mutationFn: () => api.admin.setDeadline(match.id, deadline),
    onSuccess: done,
    onError: (e) => setError(errorMessage(e)),
  })

  return (
    <Modal open onClose={onClose} title={`${nameOr(match.player1)} × ${nameOr(match.player2)}`}>
      <div className="space-y-4">
        {match.contest_reason && (
          <p className="rounded border border-destructive/40 p-2 text-sm">
            <b>Contestação:</b> {match.contest_reason}<br />
            <span className="text-muted-foreground">Lançado: {match.score_text}</span>
          </p>
        )}
        <Field label="O que fazer">
          <Select value={action} onChange={(e) => { setAction(e.target.value as Action); setError(null) }}>
            {ready && <option value="result">Registrar / corrigir resultado</option>}
            {ready && <option value="interrupted">Marcar como interrompida (chuva, luz, quadra)</option>}
            {isGroup && <option value="annulled">Anular partida</option>}
            <option value="scheduled">Voltar para “a jogar” (apaga o resultado)</option>
            <option value="deadline">Só mudar o prazo</option>
          </Select>
        </Field>

        <ErrorBox error={error} />

        {action === 'result' && (
          <ScoreForm match={match}
            allowed={isGroup ? ['normal', 'walkover', 'double_walkover', 'retired'] : ['normal', 'walkover', 'retired']}
            initial={match.score && match.result_type ? {
              result_type: match.result_type,
              score: match.result_type === 'retired' ? null : match.score,
              winner_side: match.winner_side,
            } : undefined}
            submitLabel="Salvar resultado (já confirmado)"
            busy={save.isPending}
            onSubmit={(p) => save.mutate({
              status: 'confirmed', result_type: p.result_type, score: p.score,
              winner_side: p.winner_side, played_on: p.played_on,
            })} />
        )}

        {action === 'interrupted' && (
          <div className="space-y-3">
            <Field label="Situação exata para a retomada (§9)" hint="Placar, pontos do game, quem saca e de que lado.">
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex.: 6/4 2/3, 30/15, saque do Fulano, lado da direita" />
            </Field>
            <Button className="w-full" disabled={save.isPending || !note.trim()}
              onClick={() => save.mutate({ status: 'interrupted', note })}>Registrar interrupção</Button>
          </div>
        )}

        {action === 'annulled' && (
          <div className="space-y-3">
            <Field label="Motivo"><Input value={note} onChange={(e) => setNote(e.target.value)} /></Field>
            <Button variant="danger" className="w-full" disabled={save.isPending}
              onClick={() => save.mutate({ status: 'annulled', note: note || 'Anulada pela organização' })}>Anular</Button>
          </div>
        )}

        {action === 'scheduled' && (
          <Button variant="secondary" className="w-full" disabled={save.isPending}
            onClick={() => confirm('Apagar o resultado desta partida?') && save.mutate({ status: 'scheduled', note: null })}>
            Voltar para “a jogar”
          </Button>
        )}

        {action === 'deadline' && (
          <div className="space-y-3">
            <Field label="Novo prazo"><Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} /></Field>
            <Button className="w-full" disabled={saveDeadline.isPending || !deadline}
              onClick={() => saveDeadline.mutate()}>
              Salvar prazo
            </Button>
          </div>
        )}
      </div>
    </Modal>
  )
}
