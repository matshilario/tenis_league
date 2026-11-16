import axios, { AxiosError } from 'axios'
import type {
  AuditEntry, CategoryDetail, Entry, Invite, Match, PublicUser, ResultType, Score, Season, User,
} from './types'

const BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000') + '/api/v1'
const TOKEN_KEY = 'liga.token'

export const tokenStore = {
  get: () => (typeof window === 'undefined' ? null : window.localStorage.getItem(TOKEN_KEY)),
  set: (t: string) => window.localStorage.setItem(TOKEN_KEY, t),
  clear: () => window.localStorage.removeItem(TOKEN_KEY),
}

export const http = axios.create({ baseURL: BASE })

http.interceptors.request.use((cfg) => {
  const t = tokenStore.get()
  if (t) cfg.headers.Authorization = `Bearer ${t}`
  return cfg
})

http.interceptors.response.use(
  (r) => r,
  (err: AxiosError) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      tokenStore.clear()
      if (!window.location.pathname.startsWith('/login') &&
          !window.location.pathname.startsWith('/convite')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  },
)

/** Mensagem legível de um erro da API. */
export function errorMessage(err: unknown): string {
  const e = err as AxiosError<{ detail?: unknown }>
  const d = e?.response?.data?.detail
  if (typeof d === 'string') return d
  if (Array.isArray(d)) return d.map((x: { msg?: string }) => x.msg).join('; ')
  return e?.message || 'Erro inesperado'
}

const get = <T,>(url: string, params?: object) => http.get<T>(url, { params }).then((r) => r.data)
const post = <T,>(url: string, body?: object) => http.post<T>(url, body).then((r) => r.data)
const put = <T,>(url: string, body?: object) => http.put<T>(url, body).then((r) => r.data)
const patch = <T,>(url: string, body?: object) => http.patch<T>(url, body).then((r) => r.data)
const del = <T,>(url: string) => http.delete<T>(url).then((r) => r.data)

type TokenOut = { access_token: string; user: User }

export const api = {
  // auth
  login: (email: string, password: string) => post<TokenOut>('/auth/login', { email, password }),
  checkInvite: (token: string) =>
    get<{ valid: boolean; note: string | null; reason: string | null }>(`/auth/invite/${token}`),
  register: (body: {
    invite_token: string; email: string; password: string; name: string
    nickname?: string; phone: string
  }) => post<TokenOut>('/auth/register', body),
  me: () => get<User>('/auth/me'),
  updateMe: (body: Partial<{ name: string; nickname: string; phone: string; password: string }>) =>
    patch<User>('/auth/me', body),

  // liga
  seasons: () => get<Season[]>('/seasons'),
  members: () => get<PublicUser[]>('/members'),
  category: (id: string) => get<CategoryDetail>(`/categories/${id}`),
  myMatches: () => get<Match[]>('/matches/mine'),
  report: (id: string, body: {
    result_type: 'normal' | 'retired'; score: Score; winner_side?: number | null; played_on?: string
  }) => post<Match>(`/matches/${id}/report`, body),
  confirm: (id: string) => post<Match>(`/matches/${id}/confirm`),
  contest: (id: string, reason: string) => post<Match>(`/matches/${id}/contest`, { reason }),

  // admin
  admin: {
    invites: () => get<Invite[]>('/admin/invites'),
    createInvite: (body: { note?: string; max_uses?: number; expires_in_days?: number | null }) =>
      post<Invite>('/admin/invites', body),
    revokeInvite: (id: string) => del<Invite>(`/admin/invites/${id}`),

    users: (status?: string) => get<User[]>('/admin/users', status ? { status } : undefined),
    approve: (id: string, category_id?: string | null) =>
      post<User>(`/admin/users/${id}/approve`, { category_id: category_id || null }),
    reject: (id: string) => post<User>(`/admin/users/${id}/reject`),
    sendGroupInvite: (id: string) => post<{ sent: boolean; phone: string }>(`/admin/users/${id}/group-invite`),
    patchUser: (id: string, body: { nickname?: string | null; role?: 'admin' | 'player' }) =>
      patch<User>(`/admin/users/${id}`, body),
    deleteUser: (id: string) =>
      del<{ deleted: boolean; kept_history: boolean }>(`/admin/users/${id}`),
    audit: () => get<AuditEntry[]>('/admin/audit'),

    createSeason: (body: { name: string; announcement?: string; category_name?: string }) =>
      post<Season>('/admin/seasons', body),
    patchSeason: (id: string, body: { name?: string; announcement?: string | null; is_current?: boolean }) =>
      patch<Season>(`/admin/seasons/${id}`, body),
    addCategory: (seasonId: string, name: string) =>
      post(`/admin/seasons/${seasonId}/categories`, { name }),
    patchCategory: (id: string, body: { name?: string; semis_date?: string | null; final_date?: string | null }) =>
      patch(`/admin/categories/${id}`, body),
    deleteCategory: (id: string) => del(`/admin/categories/${id}`),

    addEntry: (categoryId: string, user_id: string) =>
      post<Entry>(`/admin/categories/${categoryId}/entries`, { user_id }),
    setSeeds: (categoryId: string, entry_ids: string[]) =>
      put<Entry[]>(`/admin/categories/${categoryId}/seeds`, { entry_ids }),
    patchEntry: (id: string, body: { status?: 'active' | 'waitlist' }) =>
      patch<Entry>(`/admin/entries/${id}`, body),
    deleteEntry: (id: string) => del(`/admin/entries/${id}`),
    withdraw: (id: string, reason: string, exclude: boolean) =>
      post<Entry>(`/admin/entries/${id}/withdraw`, { reason, exclude }),
    substitute: (id: string, user_id: string) =>
      post<Entry>(`/admin/entries/${id}/substitute`, { user_id }),

    draw: (categoryId: string, start_date: string) =>
      post<CategoryDetail>(`/admin/categories/${categoryId}/draw`, { start_date }),
    undoDraw: (categoryId: string) => del<CategoryDetail>(`/admin/categories/${categoryId}/draw`),
    lottery: (categoryId: string) =>
      post<{ drawn: string[] }>(`/admin/categories/${categoryId}/lottery`),
    homologate: (categoryId: string) =>
      post<CategoryDetail>(`/admin/categories/${categoryId}/homologate`),
    semifinals: (categoryId: string) =>
      post<CategoryDetail>(`/admin/categories/${categoryId}/semifinals`),

    setMatch: (id: string, body: {
      status: 'confirmed' | 'interrupted' | 'annulled' | 'scheduled'
      result_type?: ResultType | null; score?: Score | null; winner_side?: number | null
      played_on?: string | null; note?: string | null; deadline?: string | null
    }) => put<Match>(`/admin/matches/${id}`, body),
    setDeadline: (id: string, deadline: string) => patch<Match>(`/admin/matches/${id}/deadline`, { deadline }),
    pendingMatches: () => get<Match[]>('/admin/matches/pending'),
  },
}
