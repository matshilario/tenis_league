'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useState } from 'react'
import { Button, Card, ErrorBox, Field, Input, Spinner } from '@/components/ui'
import { api, errorMessage, tokenStore } from '@/lib/api'

export default function InvitePage({ params }: { params: { token: string } }) {
  const check = useQuery({ queryKey: ['invite', params.token], queryFn: () => api.checkInvite(params.token) })
  const [f, setF] = useState({ name: '', nickname: '', email: '', phone: '', password: '' })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value })

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const r = await api.register({ invite_token: params.token, ...f,
        nickname: f.nickname || undefined, phone: f.phone || undefined })
      tokenStore.set(r.access_token)
      window.location.href = '/'
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  if (check.isLoading) return <Spinner />
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-sm p-6">
        <h1 className="text-center text-2xl font-bold">🎾 Você foi convidado!</h1>
        {!check.data?.valid ? (
          <div className="mt-4 space-y-4 text-center">
            <ErrorBox error={check.data?.reason || 'Convite inválido.'} />
            <Link href="/login" className="text-sm underline">Já tenho conta</Link>
          </div>
        ) : (
          <>
            <p className="mb-6 mt-1 text-center text-sm text-muted-foreground">
              Crie sua conta. A organização aprova a entrada em seguida.
            </p>
            <form onSubmit={submit} className="space-y-3">
              <Field label="Nome"><Input required minLength={2} value={f.name} onChange={set('name')} /></Field>
              <Field label="Apelido" hint="Como a galera te chama. Aparece na tabela.">
                <Input value={f.nickname} onChange={set('nickname')} maxLength={60} />
              </Field>
              <Field label="E-mail"><Input type="email" required autoComplete="email" value={f.email} onChange={set('email')} /></Field>
              <Field label="WhatsApp" hint="Opcional, para a organização falar com você.">
                <Input type="tel" value={f.phone} onChange={set('phone')} />
              </Field>
              <Field label="Senha" hint="Mínimo 6 caracteres.">
                <Input type="password" required minLength={6} autoComplete="new-password" value={f.password} onChange={set('password')} />
              </Field>
              <ErrorBox error={error} />
              <Button type="submit" disabled={busy} className="w-full">{busy ? 'Criando…' : 'Criar conta'}</Button>
            </form>
          </>
        )}
      </Card>
    </div>
  )
}
