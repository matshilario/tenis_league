'use client'

import { useMemo, useState } from 'react'
import type { Match, ResultType, Score } from '@/lib/types'
import { nameOr, today } from '@/lib/utils'
import { Button, Field, Input, Select } from './ui'

export interface ScorePayload {
  result_type: ResultType
  score: Score | null
  winner_side: 1 | 2 | null
  played_on: string
}

type Cell = string
const num = (c: Cell) => (c.trim() === '' ? null : Number(c))

const RESULT_LABEL: Record<ResultType, string> = {
  normal: 'Partida completa',
  retired: 'Abandono (alguém desistiu no meio)',
  walkover: 'W.O.',
  double_walkover: 'W.O. duplo (os dois responsabilizados)',
}

/**
 * Placar no formato do regulamento: 2 sets (tie-break em 6/6) + super tie-break até 10
 * quando fica 1×1. Em abandono, informa-se o placar até o momento e quem venceu; o
 * servidor completa conforme o §8.
 */
export function ScoreForm({
  match, allowed, submitLabel = 'Enviar placar', busy, onSubmit, initial,
}: {
  match: Match
  allowed: ResultType[]
  submitLabel?: string
  busy?: boolean
  onSubmit: (p: ScorePayload) => void
  initial?: Partial<ScorePayload>
}) {
  const p1 = nameOr(match.player1)
  const p2 = nameOr(match.player2)
  const init = initial?.score
  const [rt, setRt] = useState<ResultType>(initial?.result_type ?? allowed[0])
  const [sets, setSets] = useState<Cell[][]>(
    [0, 1].map((i) => (init?.sets?.[i] ?? ['', '']).map(String)),
  )
  const [tbs, setTbs] = useState<Cell[][]>(
    [0, 1].map((i) => (init?.tiebreaks?.[i] ?? ['', '']).map(String)),
  )
  const [stb, setStb] = useState<Cell[]>((init?.super_tiebreak ?? ['', '']).map(String))
  const [winner, setWinner] = useState<'' | '1' | '2'>(
    initial?.winner_side ? (String(initial.winner_side) as '1' | '2') : '',
  )
  const [playedOn, setPlayedOn] = useState(initial?.played_on ?? match.played_on ?? today())
  const [localError, setLocalError] = useState<string | null>(null)

  const setsWon = useMemo(() => {
    let a = 0, b = 0
    for (const s of sets) {
      const x = num(s[0]), y = num(s[1])
      if (x === null || y === null) continue
      const hi = Math.max(x, y), lo = Math.min(x, y)
      const done = (hi === 6 && lo <= 4) || (hi === 7 && (lo === 5 || lo === 6))
      if (!done) continue
      if (x > y) a++
      else b++
    }
    return [a, b]
  }, [sets])

  const needsStb = rt === 'normal' && setsWon[0] === 1 && setsWon[1] === 1
  const isTb = (s: Cell[]) => [num(s[0]), num(s[1])].sort().join() === '6,7'
  const needsWinner = rt === 'walkover' || rt === 'retired'
  const showSets = rt === 'normal' || rt === 'retired'

  function upd(arr: Cell[][], setArr: (v: Cell[][]) => void, i: number, j: number, v: string) {
    const copy = arr.map((r) => [...r])
    copy[i][j] = v.replace(/\D/g, '').slice(0, 2)
    setArr(copy)
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setLocalError(null)
    let score: Score | null = null
    if (showSets) {
      const filled = sets.filter((s) => num(s[0]) !== null || num(s[1]) !== null)
      if (filled.some((s) => num(s[0]) === null || num(s[1]) === null)) {
        return setLocalError('Preencha os games dos dois jogadores em cada set informado.')
      }
      if (rt === 'normal' && filled.length !== 2) return setLocalError('Informe os dois sets.')
      score = {
        sets: filled.map((s) => [num(s[0])!, num(s[1])!]),
        tiebreaks: filled.map((s, i) => {
          const t = tbs[i]
          return isTb(s) && num(t[0]) !== null && num(t[1]) !== null ? [num(t[0])!, num(t[1])!] : null
        }),
        super_tiebreak: needsStb ? [num(stb[0]) ?? -1, num(stb[1]) ?? -1] : null,
      }
      if (needsStb && (num(stb[0]) === null || num(stb[1]) === null)) {
        return setLocalError('Sets 1×1: informe o super tie-break.')
      }
    }
    if (needsWinner && !winner) return setLocalError('Informe quem venceu.')
    onSubmit({
      result_type: rt,
      score,
      winner_side: winner ? (Number(winner) as 1 | 2) : null,
      played_on: playedOn,
    })
  }

  const cell = 'h-11 w-14 text-center text-lg font-semibold tabular-nums'

  return (
    <form onSubmit={submit} className="space-y-4">
      {allowed.length > 1 && (
        <Field label="Tipo de resultado">
          <Select value={rt} onChange={(e) => setRt(e.target.value as ResultType)}>
            {allowed.map((a) => <option key={a} value={a}>{RESULT_LABEL[a]}</option>)}
          </Select>
        </Field>
      )}

      {showSets && (
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-1">
            <thead>
              <tr className="text-xs text-muted-foreground">
                <th className="text-left font-normal">Jogador</th>
                <th className="font-normal">Set 1</th>
                <th className="font-normal">Set 2</th>
                {needsStb && <th className="font-normal">Super TB</th>}
              </tr>
            </thead>
            <tbody>
              {[0, 1].map((side) => (
                <tr key={side}>
                  <td className="max-w-[9rem] truncate pr-2 text-sm font-medium">{side === 0 ? p1 : p2}</td>
                  {[0, 1].map((i) => (
                    <td key={i} className="text-center">
                      <Input inputMode="numeric" aria-label={`Set ${i + 1} ${side === 0 ? p1 : p2}`}
                             className={cell} value={sets[i][side]}
                             onChange={(e) => upd(sets, setSets, i, side, e.target.value)} />
                    </td>
                  ))}
                  {needsStb && (
                    <td className="text-center">
                      <Input inputMode="numeric" aria-label={`Super tie-break ${side === 0 ? p1 : p2}`}
                             className={cell} value={stb[side]}
                             onChange={(e) => {
                               const c = [...stb]; c[side] = e.target.value.replace(/\D/g, '').slice(0, 2); setStb(c)
                             }} />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {sets.map((s, i) => isTb(s) && (
            <div key={i} className="mt-2 flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Tie-break do set {i + 1} (opcional):</span>
              <Input inputMode="numeric" className="h-9 w-14 text-center" value={tbs[i][0]}
                     aria-label={`Tie-break set ${i + 1} ${p1}`}
                     onChange={(e) => upd(tbs, setTbs, i, 0, e.target.value)} />
              <span>×</span>
              <Input inputMode="numeric" className="h-9 w-14 text-center" value={tbs[i][1]}
                     aria-label={`Tie-break set ${i + 1} ${p2}`}
                     onChange={(e) => upd(tbs, setTbs, i, 1, e.target.value)} />
            </div>
          ))}
          {rt === 'retired' && (
            <p className="mt-2 text-xs text-muted-foreground">
              Informe o placar no momento do abandono (o último set pode estar incompleto). O app
              completa a partida a favor do vencedor, sem conceder novos games ao desistente (§8).
            </p>
          )}
        </div>
      )}

      {needsWinner && (
        <Field label={rt === 'retired' ? 'Quem venceu (quem NÃO abandonou)' : 'Vencedor do W.O.'}>
          <Select value={winner} onChange={(e) => setWinner(e.target.value as '' | '1' | '2')}>
            <option value="">Selecione…</option>
            <option value="1">{p1}</option>
            <option value="2">{p2}</option>
          </Select>
        </Field>
      )}

      <Field label="Data do jogo">
        <Input type="date" value={playedOn} onChange={(e) => setPlayedOn(e.target.value)} />
      </Field>

      {localError && <p className="text-sm text-destructive">{localError}</p>}
      <Button type="submit" disabled={busy} className="w-full">{busy ? 'Enviando…' : submitLabel}</Button>
    </form>
  )
}
