'use client'

import { useState } from 'react'
import { AuthFrame } from '@/components/AuthFrame'
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
    <AuthFrame>
      <Card className="p-6">
        <h1 className="font-display text-2xl font-bold">Entrar em quadra</h1>
        <p className="mb-5 mt-1 text-sm text-muted-foreground">Sua conta da liga.</p>
        <form onSubmit={submit} className="space-y-4">
          <Field label="E-mail">
            <Input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Senha">
            <Input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <ErrorBox error={error} />
          <Button type="submit" size="lg" disabled={busy} className="w-full">{busy ? 'Entrando…' : 'Entrar'}</Button>
        </form>
      </Card>
      <p className="mt-5 text-center text-sm text-muted-foreground">
        Ainda não joga com a gente? A entrada é por convite da organização.
      </p>
    </AuthFrame>
  )
}
