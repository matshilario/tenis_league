'use client'

import { useState } from 'react'
import { Button, Card, ErrorBox, Field, Input } from '@/components/ui'
import { api, errorMessage, tokenStore } from '@/lib/api'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const r = await api.login(email, password)
      tokenStore.set(r.access_token)
      window.location.href = '/'
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm p-6">
        <h1 className="text-center text-2xl font-bold">🎾 Liga de Tênis</h1>
        <p className="mb-6 mt-1 text-center text-sm text-muted-foreground">Entre com sua conta</p>
        <form onSubmit={submit} className="space-y-4">
          <Field label="E-mail">
            <Input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Senha">
            <Input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <ErrorBox error={error} />
          <Button type="submit" disabled={busy} className="w-full">{busy ? 'Entrando…' : 'Entrar'}</Button>
        </form>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Ainda não tem conta? A entrada é só por convite da organização.
        </p>
      </Card>
    </div>
  )
}
