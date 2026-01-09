export type UserRole = 'admin' | 'manager' | 'player'
export type PlayerCategory = 'beginner' | 'intermediate' | 'advanced'
export type RankingSystem = 'elo' | 'points'
export type MatchFormat = 'best_of_3' | 'best_of_5'
export type MatchStatus = 'pending' | 'confirmed' | 'disputed' | 'cancelled'
export type TournamentStatus = 'draft' | 'registration' | 'in_progress' | 'completed'
export type TournamentFormat = 'single_elimination' | 'double_elimination'
export type ScheduleStatus = 'proposed' | 'accepted' | 'rejected' | 'completed' | 'cancelled'
export type ResponseStatus = 'pending' | 'accepted' | 'rejected'

export interface Tenant {
  id: string
  name: string
  slug: string
  logo_url: string | null
  primary_color: string
  settings: Record<string, unknown>
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  tenant_id: string
  email: string
  full_name: string
  role: UserRole
  is_active: boolean
  email_verified: boolean
  created_at: string
  updated_at: string
}

export interface Player {
  id: string
  tenant_id: string
  user_id: string | null
  name: string
  email: string | null
  phone: string | null
  category: PlayerCategory
  avatar_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface PlayerWithStats extends Player {
  total_matches: number
  wins: number
  losses: number
  win_rate: number
  current_elo: number
  current_points: number
}

export interface League {
  id: string
  tenant_id: string
  name: string
  description: string | null
  ranking_system: RankingSystem
  match_format: MatchFormat
  season_start: string | null
  season_end: string | null
  is_active: boolean
  settings: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface LeaguePlayer {
  id: string
  league_id: string
  player_id: string
  player_name: string
  elo_rating: number
  points: number
  wins: number
  losses: number
  joined_at: string
}

export interface Match {
  id: string
  tenant_id: string
  league_id: string
  tournament_id: string | null
  player1_id: string
  player2_id: string
  winner_id: string | null
  score: { sets: number[][] } | null
  played_at: string | null
  confirmed_by_player1: boolean
  confirmed_by_player2: boolean
  confirmed_by_admin: boolean
  status: MatchStatus
  is_walkover: boolean
  walkover_player_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface MatchWithPlayers extends Match {
  player1_name: string
  player2_name: string
  winner_name: string | null
}

export interface Ranking {
  position: number
  player_id: string
  player_name: string
  elo_rating: number
  points: number
  wins: number
  losses: number
  win_rate: number
}

export interface RankingHistory {
  id: string
  player_id: string
  match_id: string
  rating_before: number
  rating_after: number
  rating_change: number
  points_before: number
  points_after: number
  points_change: number
  recorded_at: string
}

export interface HeadToHead {
  player1_id: string
  player1_name: string
  player2_id: string
  player2_name: string
  player1_wins: number
  player2_wins: number
  total_matches: number
  matches: {
    match_id: string
    winner_id: string | null
    score: { sets: number[][] } | null
    played_at: string | null
  }[]
}

export interface Tournament {
  id: string
  tenant_id: string
  league_id: string | null
  name: string
  description: string | null
  format: TournamentFormat
  size: number
  status: TournamentStatus
  registration_deadline: string | null
  start_date: string | null
  end_date: string | null
  settings: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface TournamentParticipant {
  id: string
  tournament_id: string
  player_id: string
  player_name: string
  seed: number | null
  status: 'registered' | 'eliminated' | 'winner'
  registered_at: string
}

export interface TournamentMatch {
  id: string
  tournament_id: string
  match_id: string | null
  round: number
  position: number
  player1_id: string | null
  player1_name: string | null
  player2_id: string | null
  player2_name: string | null
  winner_id: string | null
  winner_name: string | null
  next_match_id: string | null
  score: { sets: number[][] } | null
}

export interface TournamentBracket {
  tournament: Tournament
  participants: TournamentParticipant[]
  matches: TournamentMatch[]
  rounds: number
}

export interface Schedule {
  id: string
  tenant_id: string
  league_id: string | null
  match_id: string | null
  player1_id: string
  player2_id: string
  proposed_by: string
  proposed_datetime: string
  location: string | null
  status: ScheduleStatus
  player1_response: ResponseStatus
  player2_response: ResponseStatus
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ScheduleWithPlayers extends Schedule {
  player1_name: string
  player2_name: string
  proposer_name: string
}

export interface Token {
  access_token: string
  refresh_token: string
  token_type: string
}
