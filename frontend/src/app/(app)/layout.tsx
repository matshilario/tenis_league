'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AppShell } from '@/components/AppShell'
import { AuthFrame } from '@/components/AuthFrame'
import { Button, Card, Spinner } from '@/components/ui'
import { tokenStore } from '@/lib/api'
import { useLogout, useMe } from '@/lib/auth'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const me = useMe()
  const logout = useLogout()

  useEffect(() => {
    if (!tokenStore.get()) router.replace('/login')
    else setReady(true)
  }, [router])

  if (!ready || me.isLoading || !me.data) return <Spinner />

  if (me.data.status === 'pending') {
    return (
      <AuthFrame>
        <Card className="p-6 text-center">
          <h1 className="font-display text-2xl font-bold">Cadastro recebido!</h1>
          <p className="mt-2 text-muted-foreground">
            Oi, {me.data.display_name}. A organização precisa aprovar sua entrada na liga.
            Enquanto isso, vai aquecendo o saque.
          </p>
          <div className="mt-5 flex justify-center gap-2">
            <Button variant="secondary" onClick={() => me.refetch()}>Verificar de novo</Button>
            <Button variant="ghost" onClick={logout}>Sair</Button>
          </div>
        </Card>
      </AuthFrame>
    )
  }

  return <AppShell user={me.data}>{children}</AppShell>
}
