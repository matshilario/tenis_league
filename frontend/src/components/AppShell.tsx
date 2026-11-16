'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLogout } from '@/lib/auth'
import type { User } from '@/lib/types'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/', label: 'Início' },
  { href: '/jogos', label: 'Meus jogos' },
  { href: '/classificacao', label: 'Classificação' },
  { href: '/chave', label: 'Chave' },
  { href: '/regulamento', label: 'Regulamento' },
]

export function AppShell({ user, children }: { user: User; children: React.ReactNode }) {
  const path = usePathname()
  const logout = useLogout()
  const items = user.role === 'admin' ? [...NAV, { href: '/admin', label: 'Admin' }] : NAV
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2">
          <Link href="/" className="font-bold">🎾 Liga</Link>
          <div className="flex items-center gap-3 text-sm">
            <Link href="/perfil" className="max-w-[10rem] truncate hover:underline">{user.display_name}</Link>
            <button onClick={logout} className="text-muted-foreground hover:text-foreground">Sair</button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-2 pb-2 text-sm" aria-label="Principal">
          {items.map((n) => {
            const active = n.href === '/' ? path === '/' : path.startsWith(n.href)
            return (
              <Link key={n.href} href={n.href}
                className={cn('whitespace-nowrap rounded-md px-3 py-1.5',
                  active ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}>
                {n.label}
              </Link>
            )
          })}
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-5">{children}</main>
    </div>
  )
}
