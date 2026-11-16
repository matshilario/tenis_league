'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/PageHeader'
import { Button, Card, ErrorBox, Field, Input } from '@/components/ui'
import { api, errorMessage } from '@/lib/api'
import { useMe } from '@/lib/auth'

export default function ProfilePage() {
  const me = useMe()
  const qc = useQueryClient()
  const [f, setF] = useState({ name: '', nickname: '', phone: '', password: '' })
  const [msg, setMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (me.data) setF({ name: me.data.name, nickname: me.data.nickname ?? '', phone: me.data.phone ?? '', password: '' })
  }, [me.data])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setError(null); setMsg(null)
    try {
      await api.updateMe({ name: f.name, nickname: f.nickname, phone: f.phone, ...(f.password ? { password: f.password } : {}) })
      await qc.invalidateQueries({ queryKey: ['me'] })
      setMsg('Salvo!')
      setF({ ...f, password: '' })
    } catch (err) { setError(errorMessage(err)) }
  }
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value })

  return (
    <div className="mx-auto max-w-md">
    <PageHeader eyebrow="Ficha do jogador" title="Meu perfil" />
    <Card>
      <form onSubmit={save} className="space-y-3">
        <Field label="Nome"><Input required minLength={2} value={f.name} onChange={set('name')} /></Field>
        <Field label="Apelido"><Input value={f.nickname} onChange={set('nickname')} maxLength={60} /></Field>
        <Field label="WhatsApp" hint="Com DDD. É por aqui que chegam os convites e avisos da liga.">
          <Input type="tel" inputMode="tel" placeholder="(92) 99999-9999" value={f.phone} onChange={set('phone')} />
        </Field>
        <Field label="Nova senha" hint="Deixe em branco para manter.">
          <Input type="password" minLength={6} autoComplete="new-password" value={f.password} onChange={set('password')} />
        </Field>
        <ErrorBox error={error} />
        {msg && <p role="status" className="text-sm font-semibold text-court">{msg}</p>}
        <Button type="submit" className="w-full">Salvar</Button>
      </form>
    </Card>
    </div>
  )
}
