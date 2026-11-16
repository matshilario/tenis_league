'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Badge, Button, Card, Select, Spinner } from '@/components/ui'
import { api, errorMessage } from '@/lib/api'
import { useMe } from '@/lib/auth'
import type { User } from '@/lib/types'
import { useCategory } from '@/lib/useCategory'
import { fmtDate, fmtPhone } from '@/lib/utils'

const STATUS: Record<User['status'], [string, 'warn' | 'good' | 'bad' | 'neutral']> = {
  pending: ['pendente', 'warn'], approved: ['aprovado', 'good'], rejected: ['recusado', 'bad'], removed: ['removido', 'neutral'],
}

export function MembersTab() {
  const me = useMe()
  const qc = useQueryClient()
  const users = useQuery({ queryKey: ['admin-users'], queryFn: () => api.admin.users() })
  const { categories } = useCategory()
  const regCats = categories.filter((c) => c.phase === 'registration')
  const [catFor, setCatFor] = useState<Record<string, string>>({})
  const [showOld, setShowOld] = useState(false)

  const done = () => {
    qc.invalidateQueries({ queryKey: ['admin-users'] })
    qc.invalidateQueries({ queryKey: ['category'] })
    qc.invalidateQueries({ queryKey: ['members'] })
  }
  const run = useMutation({
    mutationFn: (fn: () => Promise<unknown>) => fn(),
    onSuccess: done,
    onError: (e) => alert(errorMessage(e)),
  })

  async function groupInvite(u: User) {
    if (!confirm(`Enviar o convite do grupo da liga para o WhatsApp de ${u.display_name}?`)) return
    try {
      const r = await api.admin.sendGroupInvite(u.id)
      alert(`Convite do grupo enviado para ${fmtPhone(r.phone)}.`)
    } catch (e) { alert(errorMessage(e)) }
  }

  if (users.isLoading) return <Spinner />
  const list = users.data ?? []
  const pending = list.filter((u) => u.status === 'pending')
  const approved = list.filter((u) => u.status === 'approved')
  const old = list.filter((u) => u.status === 'rejected' || u.status === 'removed')

  async function remove(u: User) {
    if (!confirm(`Excluir ${u.display_name}?\n\nSe já jogou na temporada, o histórico é mantido e ele é retirado das categorias em andamento (jogos pendentes são anulados conforme o §9).`)) return
    run.mutate(async () => {
      const r = await api.admin.deleteUser(u.id)
      if (r.kept_history) alert('Membro removido; histórico de jogos preservado.')
    })
  }

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-2 font-semibold">Aguardando aprovação ({pending.length})</h2>
        {pending.length === 0 && <p className="text-sm text-muted-foreground">Ninguém na fila.</p>}
        <div className="space-y-2">
          {pending.map((u) => (
            <Card key={u.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <div className="font-medium">{u.name}{u.nickname && <span className="text-muted-foreground"> “{u.nickname}”</span>}</div>
                <div className="text-xs text-muted-foreground">{u.email} · {u.phone ? fmtPhone(u.phone) : <Badge tone="warn">sem WhatsApp</Badge>} · {fmtDate(u.created_at)}</div>
                {u.phone && <div className="mt-1 text-xs text-muted-foreground">Ao aprovar, ele recebe no WhatsApp o convite do grupo da liga.</div>}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {regCats.length > 0 && (
                  <Select className="h-8 w-auto" value={catFor[u.id] ?? regCats[0].id}
                    onChange={(e) => setCatFor({ ...catFor, [u.id]: e.target.value })} aria-label="Inscrever na categoria">
                    {regCats.map((c) => <option key={c.id} value={c.id}>Inscrever em {c.name}</option>)}
                    <option value="">Só aprovar</option>
                  </Select>
                )}
                <Button size="sm" onClick={() => run.mutate(() => api.admin.approve(u.id, regCats.length ? (catFor[u.id] ?? regCats[0].id) : null))}>Aprovar</Button>
                <Button size="sm" variant="ghost" onClick={() => confirm(`Recusar ${u.name}?`) && run.mutate(() => api.admin.reject(u.id))}>Recusar</Button>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 font-semibold">Membros ({approved.length})</h2>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="bg-muted/60 text-left text-xs text-muted-foreground">
              <tr><th className="px-3 py-2">Nome</th><th className="px-3">Contato</th><th className="px-3">Papel</th><th className="px-3" /></tr>
            </thead>
            <tbody>
              {approved.map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="px-3 py-2">
                    <div className="font-medium">{u.display_name}</div>
                    {u.nickname && <div className="text-xs text-muted-foreground">{u.name}</div>}
                  </td>
                  <td className="px-3 text-xs">{u.email}<br />{u.phone ? fmtPhone(u.phone) : <Badge tone="warn">sem WhatsApp</Badge>}</td>
                  <td className="px-3">
                    <Select className="h-8 w-auto" value={u.role} disabled={u.id === me.data?.id}
                      onChange={(e) => run.mutate(() => api.admin.patchUser(u.id, { role: e.target.value as User['role'] }))}>
                      <option value="player">Jogador</option>
                      <option value="admin">Admin</option>
                    </Select>
                  </td>
                  <td className="px-3 text-right">
                    {u.phone && (
                      <Button size="sm" variant="ghost" className="text-xs" onClick={() => groupInvite(u)}>Convite do grupo</Button>
                    )}
                    <Button size="sm" variant="ghost" className="text-xs" onClick={() => {
                      const n = prompt('Apelido (vazio remove):', u.nickname ?? '')
                      if (n !== null) run.mutate(() => api.admin.patchUser(u.id, { nickname: n }))
                    }}>Apelido</Button>
                    {u.id !== me.data?.id && (
                      <Button size="sm" variant="ghost" className="text-xs text-destructive" onClick={() => remove(u)}>Excluir</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {old.length > 0 && (
        <section>
          <button className="text-sm underline" onClick={() => setShowOld(!showOld)}>
            {showOld ? 'Ocultar' : 'Mostrar'} recusados/removidos ({old.length})
          </button>
          {showOld && (
            <ul className="mt-2 space-y-1 text-sm">
              {old.map((u) => (
                <li key={u.id}>{u.display_name} <Badge tone={STATUS[u.status][1]}>{STATUS[u.status][0]}</Badge></li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  )
}
