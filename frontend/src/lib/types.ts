export type Role = 'admin' | 'player'
export type UserStatus = 'pending' | 'approved' | 'rejected' | 'removed'
export type Phase = 'registration' | 'group_stage' | 'knockout' | 'finished'
export type EntryStatus = 'active' | 'waitlist' | 'withdrawn' | 'excluded'
export type Stage = 'group' | 'semifinal' | 'final'
export type MatchStatus =
  | 'scheduled' | 'reported' | 'contested' | 'confirmed' | 'interrupted' | 'annulled' | 'bye'
export type ResultType = 'normal' | 'walkover' | 'double_walkover' | 'retired'

export interface PublicUser { id: string; name: string; nickname: string | null; display_name: string }

export interface User extends PublicUser {
  email: string
  phone: string | null
  role: Role
  status: UserStatus
  created_at: string
  approved_at: string | null
}

export interface Score {
  sets: number[][]
  tiebreaks?: (number[] | null)[]
  super_tiebreak?: number[] | null
  stb_awarded?: boolean
}

export interface Category {
  id: string
  name: string
  phase: Phase
  n_groups: number | null
  start_date: string | null
  makeup_deadline: string | null
  semis_date: string | null
  final_date: string | null
  homologated_at: string | null
  champion_entry_id: string | null
}

export interface Season {
  id: string
  name: string
  announcement: string | null
  is_current: boolean
  created_at: string
  categories: Category[]
}

export interface Entry {
  id: string
  user: PublicUser
  seed: number | null
  group_name: string | null
  status: EntryStatus
  eligible_finals: boolean
  lottery_rank: number | null
  status_reason: string | null
}

export interface Match {
  id: string
  category_id: string
  stage: Stage
  group_name: string | null
  round: number | null
  slot: number | null
  deadline: string | null
  entry1_id: string | null
  entry2_id: string | null
  player1: PublicUser | null
  player2: PublicUser | null
  status: MatchStatus
  result_type: ResultType | null
  score: Score | null
  score_text: string
  winner_side: 1 | 2 | null
  played_on: string | null
  reported_by_id: string | null
  reported_at: string | null
  contest_deadline: string | null
  contest_reason: string | null
  note: string | null
}

export interface StandingRow {
  position: number
  entry_id: string
  player: PublicUser
  entry_status: EntryStatus
  eligible_finals: boolean
  played: number
  wins: number
  losses: number
  sets_won: number
  sets_lost: number
  games_won: number
  games_lost: number
  wo_losses: number
  points: number
  form: string[]
  decided_by: string | null
  needs_lottery: boolean
  qualifies: boolean
}

export interface CategoryDetail {
  category: Category
  season: { id: string; name: string; announcement: string | null }
  entries: Entry[]
  groups: { name: string; rows: StandingRow[] }[]
  matches: Match[]
  champion: PublicUser | null
}

export interface Invite {
  id: string
  token: string
  note: string | null
  max_uses: number
  uses: number
  expires_at: string | null
  revoked: boolean
  created_at: string
  url: string
  valid: boolean
}

export interface AuditEntry {
  id: string
  action: string
  summary: string
  details: Record<string, unknown> | null
  created_at: string
  actor_id: string | null
}
