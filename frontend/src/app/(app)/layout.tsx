'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AppShell } from '@/components/AppShell'
import { Spinner } from '@/components/ui'
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
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="text-4xl">⏳</div>
        <h1 className="mt-3 text-xl font-semibold">Cadastro recebido!</h1>
        <p className="mt-2 text-muted-foreground">
          Oi, {me.data.display_name}. A organização precisa aprovar sua entrada na liga.
          Assim que aprovar, é só voltar aqui.
        </p>
        <div className="mt-6 flex justify-center gap-4 text-sm">
          <button className="underline" onClick={() => me.refetch()}>Verificar de novo</button>
          <button className="text-muted-foreground underline" onClick={logout}>Sair</button>
        </div>
      </div>
    )
  }

  return <AppShell user={me.data}>{children}</AppShell>
}
