'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { CategoryPicker } from '@/components/CategoryPicker'
import { StandingsTable } from '@/components/StandingsTable'
import { Badge, Button, Card, ErrorBox, Field, Input, Modal, Select, Spinner, Textarea } from '@/components/ui'
import { api, errorMessage } from '@/lib/api'
import type { CategoryDetail, Entry, Season } from '@/lib/types'
import { useCategory } from '@/lib/useCategory'
import { ENTRY_STATUS, PHASE, fmtDate, today } from '@/lib/utils'

export function SeasonTab() {
  const { seasons, season, categories, categoryId, choose, detail } = useCategory()
  if (seasons.isLoading) return <Spinner />
  return (
    <div className="space-y-6">
      {!season ? <NewSeason /> : (
        <>
          <SeasonCard season={season} />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CategoryPicker categories={categories} value={categoryId} onChange={choose} />
          </div>
          {detail.data ? <CategoryAdmin d={detail.data} /> : detail.isLoading ? <Spinner /> : null}
          <details className="text-sm">
            <summary className="cursor-pointer text-muted-foreground">Nova temporada</summary>
            <div className="mt-3"><NewSeason /></div>
          </details>
        </>
      )}
    </div>
  )
}

function useRefresh() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: ['seasons'] })
    qc.invalidateQueries({ queryKey: ['category'] })
    qc.invalidateQueries({ queryKey: ['my-matches'] })
    qc.invalidateQueries({ queryKey: ['admin-pending-matches'] })
  }
}

function useAction() {
  const refresh = useRefresh()
  const [error, setError] = useState<string | null>(null)
  const m = useMutation({
    mutationFn: (fn: () => Promise<unknown>) => fn(),
    onMutate: () => setError(null),
    onSuccess: refresh,
    onError: (e) => setError(errorMessage(e)),
  })
  return { run: m.mutate, busy: m.isPending, error, setError }
}

function NewSeason() {
  const [f, setF] = useState({ name: '', announcement: '', category_name: 'Principal' })
  const a = useAction()
  return (
    <Card>
      <h2 className="mb-3 font-semibold">Criar temporada</h2>
      <div className="space-y-3">
        <Field label="Nome"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Ex.: Temporada 2027/1" /></Field>
        <Field label="Primeira categoria"><Input value={f.category_name} onChange={(e) => setF({ ...f, category_name: e.target.value })} /></Field>
        <Field label="Comunicado (local, taxa, bolas, premiação…)" hint="Aparece na página inicial.">
          <Textarea value={f.announcement} onChange={(e) => setF({ ...f, announcement: e.target.value })} />
        </Field>
        <ErrorBox error={a.error} />
        <Button disabled={a.busy || f.name.length < 2} onClick={() => a.run(() => api.admin.createSeason({
          name: f.name, announcement: f.announcement || undefined, category_name: f.category_name || 'Principal',
        }))}>Criar</Button>
      </div>
    </Card>
  )
}

function SeasonCard({ season }: { season: Season }) {
  const [edit, setEdit] = useState(false)
  const [name, setName] = useState(season.name)
  const [ann, setAnn] = useState(season.announcement ?? '')
  const [newCat, setNewCat] = useState('')
  const a = useAction()
  useEffect(() => { setName(season.name); setAnn(season.announcement ?? '') }, [season])
  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{season.name}</h2>
        <Button size="sm" variant="ghost" onClick={() => setEdit(!edit)}>{edit ? 'Fechar' : 'Editar'}</Button>
      </div>
      {edit && (
        <div className="mt-3 space-y-3">
          <Field label="Nome"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Comunicado"><Textarea value={ann} onChange={(e) => setAnn(e.target.value)} /></Field>
          <Button size="sm" disabled={a.busy} onClick={() => a.run(() => api.admin.patchSeason(season.id, { name, announcement: ann || null }))}>Salvar</Button>
          <div className="flex items-end gap-2 border-t pt-3">
            <Field label="Adicionar categoria"><Input value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="Ex.: B" /></Field>
            <Button size="sm" disabled={!newCat || a.busy} onClick={() => a.run(async () => { await api.admin.addCategory(season.id, newCat); setNewCat('') })}>Adicionar</Button>
          </div>
        </div>
      )}
      <ErrorBox error={a.error} />
    </Card>
  )
}

function CategoryAdmin({ d }: { d: CategoryDetail }) {
  const c = d.category
  const a = useAction()
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-xl font-semibold">Categoria {c.name}</h2>
        <Badge tone="info">{PHASE[c.phase]}</Badge>
        {c.homologated_at && <Badge tone="good">homologada</Badge>}
      </div>
      <ErrorBox error={a.error} />
      {c.phase === 'registration' ? <Registration d={d} /> : <InProgress d={d} />}
    </div>
  )
}

// ------------------------------------------------------------------- inscrições
function Registration({ d }: { d: CategoryDetail }) {
  const c = d.category
  const a = useAction()
  const members = useQuery({ queryKey: ['members'], queryFn: api.members })
  const [pick, setPick] = useState('')
  const [start, setStart] = useState(today())
  const active = d.entries.filter((e) => e.status === 'active')
  const waitlist = d.entries.filter((e) => e.status === 'waitlist')
  const entered = new Set(d.entries.map((e) => e.user.id))
  const available = (members.data ?? []).filter((m) => !entered.has(m.id))
  const nGroups = active.length >= 11 ? 2 : 1

  function move(i: number, dir: -1 | 1) {
    const ids = active.map((e) => e.id)
    const j = i + dir
    if (j < 0 || j >= ids.length) return
    ;[ids[i], ids[j]] = [ids[j], ids[i]]
    a.run(() => api.admin.setSeeds(c.id, [...ids, ...waitlist.map((e) => e.id)]))
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[3fr_2fr]">
      <Card>
        <h3 className="mb-1 font-semibold">Inscritos ({active.length}/20)</h3>
        <p className="mb-3 text-xs text-muted-foreground">
          Ordene por nível (ranking anterior ou avaliação técnica). A ordem define a serpentina
          {nGroups === 2 ? ' A, B, B, A…' : ''}. Mínimo 4, máximo 20.
        </p>
        <ol className="space-y-1">
          {active.map((e, i) => (
            <li key={e.id} className="flex items-center gap-2 rounded border px-2 py-1.5 text-sm">
              <span className="w-6 text-right tabular-nums text-muted-foreground">{i + 1}</span>
              <span className="flex-1 truncate">{e.user.display_name}</span>
              {nGroups === 2 && <Badge>{['A', 'B', 'B', 'A'][i % 4]}</Badge>}
              <button className="px-1 disabled:opacity-30" disabled={i === 0 || a.busy} onClick={() => move(i, -1)} aria-label="Subir">▲</button>
              <button className="px-1 disabled:opacity-30" disabled={i === active.length - 1 || a.busy} onClick={() => move(i, 1)} aria-label="Descer">▼</button>
              <button className="px-1 text-xs text-muted-foreground" onClick={() => a.run(() => api.admin.patchEntry(e.id, { status: 'waitlist' }))}>espera</button>
              <button className="px-1 text-xs text-destructive" onClick={() => a.run(() => api.admin.deleteEntry(e.id))} aria-label="Remover">✕</button>
            </li>
          ))}
        </ol>
        {waitlist.length > 0 && (
          <>
            <h4 className="mb-1 mt-4 text-sm font-semibold">Lista de espera</h4>
            <ul className="space-y-1">
              {waitlist.map((e) => (
                <li key={e.id} className="flex items-center gap-2 rounded border border-dashed px-2 py-1.5 text-sm">
                  <span className="flex-1">{e.user.display_name}</span>
                  <button className="text-xs underline" onClick={() => a.run(() => api.admin.patchEntry(e.id, { status: 'active' }))}>promover</button>
                  <button className="px-1 text-xs text-destructive" onClick={() => a.run(() => api.admin.deleteEntry(e.id))}>✕</button>
                </li>
              ))}
            </ul>
          </>
        )}
        <div className="mt-4 flex gap-2">
          <Select value={pick} onChange={(e) => setPick(e.target.value)} aria-label="Membro">
            <option value="">Inscrever membro…</option>
            {available.map((m) => <option key={m.id} value={m.id}>{m.display_name}</option>)}
          </Select>
          <Button disabled={!pick || a.busy} onClick={() => a.run(async () => { await api.admin.addEntry(c.id, pick); setPick('') })}>Inscrever</Button>
        </div>
      </Card>

      <div className="space-y-4">
        <Card>
          <h3 className="mb-2 font-semibold">Sortear grupos e rodadas</h3>
          <p className="mb-3 text-sm text-muted-foreground">
            {active.length < 4 ? `Faltam ${4 - active.length} inscritos para o mínimo.` :
              `${active.length} inscritos → ${nGroups === 1 ? 'grupo único' : 'dois grupos'}, todos contra todos, uma rodada por semana + semana de reposição.`}
          </p>
          <Field label="Início da rodada 1" hint="Prazo de cada rodada = 7 dias a partir daqui.">
            <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Button className="mt-3 w-full" disabled={active.length < 4 || a.busy}
            onClick={() => confirm('Publicar grupos e confrontos? As inscrições serão encerradas.') &&
              a.run(() => api.admin.draw(c.id, start))}>
            Sortear e publicar
          </Button>
        </Card>
        <Button variant="ghost" className="text-xs text-destructive" onClick={() =>
          confirm(`Excluir a categoria ${c.name}?`) && a.run(() => api.admin.deleteCategory(c.id))}>
          Excluir categoria
        </Button>
        <ErrorBox error={a.error} />
      </div>
    </div>
  )
}

// ------------------------------------------------------------ temporada em curso
function InProgress({ d }: { d: CategoryDetail }) {
  const c = d.category
  const a = useAction()
  const [semis, setSemis] = useState(c.semis_date ?? '')
  const [final, setFinal] = useState(c.final_date ?? '')
  const [withdrawing, setWithdrawing] = useState<Entry | null>(null)
  const [substituting, setSubstituting] = useState<Entry | null>(null)
  const needsLottery = d.groups.some((g) => g.rows.some((r) => r.needs_lottery))
  const groupMatches = d.matches.filter((m) => m.stage === 'group')
  const open = groupMatches.filter((m) => !['confirmed', 'annulled'].includes(m.status)).length
  const hasResults = d.matches.some((m) => !['scheduled', 'annulled'].includes(m.status))
  const hasSemis = d.matches.some((m) => m.stage === 'semifinal')

  return (
    <div className="space-y-5">
      <Card>
        <h3 className="mb-3 font-semibold">Fases</h3>
        <ol className="space-y-3 text-sm">
          <li className="flex flex-wrap items-center justify-between gap-2">
            <span>1. Fase classificatória — {open === 0 ? 'todos os jogos resolvidos' : `${open} jogo(s) em aberto`}</span>
            {!hasResults && (
              <Button size="sm" variant="ghost" onClick={() => confirm('Desfazer o sorteio e reabrir inscrições?') && a.run(() => api.admin.undoDraw(c.id))}>Desfazer sorteio</Button>
            )}
          </li>
          {needsLottery && (
            <li className="flex flex-wrap items-center justify-between gap-2">
              <span>Empate total em algum grupo → sorteio da organização (§6, critério 6)</span>
              <Button size="sm" variant="secondary" onClick={() => a.run(async () => {
                const r = await api.admin.lottery(c.id)
                alert('Sorteio: \n' + r.drawn.join('\n'))
              })}>Sortear desempate</Button>
            </li>
          )}
          <li className="flex flex-wrap items-center justify-between gap-2">
            <span>2. Homologar classificação {c.homologated_at && `(em ${fmtDate(c.homologated_at)})`}</span>
            {c.phase === 'group_stage' && !c.homologated_at && (
              <Button size="sm" onClick={() => a.run(() => api.admin.homologate(c.id))}>Homologar</Button>
            )}
          </li>
          <li className="flex flex-wrap items-center justify-between gap-2">
            <span>3. Semifinais {hasSemis ? 'definidas' : ''}</span>
            {c.homologated_at && c.phase !== 'finished' && (
              <Button size="sm" variant={hasSemis ? 'secondary' : 'primary'}
                onClick={() => (!hasSemis || confirm('Remontar as semifinais (substituição de desistente antes da 1ª semi)?')) &&
                  a.run(() => api.admin.semifinals(c.id))}>
                {hasSemis ? 'Remontar' : 'Gerar semifinais'}
              </Button>
            )}
          </li>
        </ol>
        <div className="mt-4 grid gap-3 border-t pt-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <Field label="Data das semifinais"><Input type="date" value={semis} onChange={(e) => setSemis(e.target.value)} /></Field>
          <Field label="Data da final"><Input type="date" value={final} onChange={(e) => setFinal(e.target.value)} /></Field>
          <Button variant="secondary" onClick={() => a.run(() => api.admin.patchCategory(c.id, { semis_date: semis || null, final_date: final || null }))}>Salvar datas</Button>
        </div>
        <ErrorBox error={a.error} />
      </Card>

      {d.groups.map((g) => (
        <StandingsTable key={g.name} rows={g.rows} title={d.groups.length > 1 ? `Grupo ${g.name}` : 'Classificação'} />
      ))}

      <Card>
        <h3 className="mb-2 font-semibold">Participantes</h3>
        <ul className="divide-y text-sm">
          {d.entries.filter((e) => e.status !== 'waitlist').map((e) => (
            <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span>
                {e.user.display_name} {e.group_name && d.groups.length > 1 && <Badge>Grupo {e.group_name}</Badge>}{' '}
                {e.status !== 'active' && <Badge tone="bad">{ENTRY_STATUS[e.status]}</Badge>}
                {e.status_reason && <span className="ml-1 text-xs text-muted-foreground">({e.status_reason})</span>}
              </span>
              {e.status === 'active' && c.phase !== 'finished' && (
                <span className="flex gap-1">
                  {c.phase === 'group_stage' && (
                    <Button size="sm" variant="ghost" className="text-xs" onClick={() => setSubstituting(e)}>Substituir</Button>
                  )}
                  <Button size="sm" variant="ghost" className="text-xs text-destructive" onClick={() => setWithdrawing(e)}>Retirar</Button>
                </span>
              )}
            </li>
          ))}
        </ul>
      </Card>

      <WithdrawModal entry={withdrawing} onClose={() => setWithdrawing(null)} />
      <SubstituteModal entry={substituting} d={d} onClose={() => setSubstituting(null)} />
    </div>
  )
}

function WithdrawModal({ entry, onClose }: { entry: Entry | null; onClose: () => void }) {
  const a = useAction()
  const [reason, setReason] = useState('')
  const [exclude, setExclude] = useState(false)
  return (
    <Modal open={!!entry} onClose={onClose} title={`Retirar ${entry?.user.display_name ?? ''}`}>
      <div className="space-y-3 text-sm">
        <p className="text-muted-foreground">
          Regulamento §9: se ele ainda tem jogos a fazer, <b>todos os resultados contra ele são anulados</b>.
          Se já concluiu todos os jogos, os resultados ficam, mas ele não vai às finais.
        </p>
        <Field label="Motivo"><Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex.: lesão, mudança de cidade" /></Field>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={exclude} onChange={(e) => setExclude(e.target.checked)} />
          Exclusão disciplinar (§10), em vez de desistência
        </label>
        <ErrorBox error={a.error} />
        <Button variant="danger" className="w-full" disabled={a.busy}
          onClick={() => a.run(async () => { await api.admin.withdraw(entry!.id, reason, exclude); onClose(); setReason(''); setExclude(false) })}>
          Confirmar retirada
        </Button>
      </div>
    </Modal>
  )
}

function SubstituteModal({ entry, d, onClose }: { entry: Entry | null; d: CategoryDetail; onClose: () => void }) {
  const a = useAction()
  const members = useQuery({ queryKey: ['members'], queryFn: api.members })
  const [pick, setPick] = useState('')
  const entered = new Set(d.entries.map((e) => e.user.id))
  return (
    <Modal open={!!entry} onClose={onClose} title={`Substituir ${entry?.user.display_name ?? ''}`}>
      <div className="space-y-3 text-sm">
        <p className="text-muted-foreground">
          Só para quem ainda não disputou partida, antes do fim da primeira rodada (§9). O substituto herda os confrontos.
        </p>
        <Select value={pick} onChange={(e) => setPick(e.target.value)}>
          <option value="">Escolha o substituto…</option>
          {(members.data ?? []).filter((m) => !entered.has(m.id)).map((m) => <option key={m.id} value={m.id}>{m.display_name}</option>)}
        </Select>
        <ErrorBox error={a.error} />
        <Button className="w-full" disabled={!pick || a.busy}
          onClick={() => a.run(async () => { await api.admin.substitute(entry!.id, pick); onClose(); setPick('') })}>
          Substituir
        </Button>
      </div>
    </Modal>
  )
}
