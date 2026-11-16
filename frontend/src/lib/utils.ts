import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { EntryStatus, Match, MatchStatus, Phase } from './types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function fmtDate(d: string | null | undefined, withWeekday = false) {
  if (!d) return '—'
  const dt = new Date(d.length === 10 ? d + 'T12:00:00' : d)
  return dt.toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', ...(withWeekday ? { weekday: 'short' } : {}),
  })
}

export function fmtDateTime(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

export const today = () => new Date().toISOString().slice(0, 10)

export const MATCH_STATUS: Record<MatchStatus, string> = {
  scheduled: 'A jogar',
  reported: 'Aguardando confirmação',
  contested: 'Contestada',
  confirmed: 'Confirmada',
  interrupted: 'Interrompida',
  annulled: 'Anulada',
  bye: 'Folga',
}

export const PHASE: Record<Phase, string> = {
  registration: 'Inscrições',
  group_stage: 'Fase classificatória',
  knockout: 'Mata-mata',
  finished: 'Encerrada',
}

export const ENTRY_STATUS: Record<EntryStatus, string> = {
  active: 'Ativo',
  waitlist: 'Lista de espera',
  withdrawn: 'Retirado',
  excluded: 'Excluído',
}

export function stageLabel(m: Match, nGroups?: number | null) {
  if (m.stage === 'semifinal') return `Semifinal ${m.slot}`
  if (m.stage === 'final') return 'Final'
  return `Rodada ${m.round}` + ((nGroups ?? 1) > 1 && m.group_name ? ` · Grupo ${m.group_name}` : '')
}

export const nameOr = (u: { display_name: string } | null | undefined, fallback = 'A definir') =>
  u?.display_name ?? fallback
