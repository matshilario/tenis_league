'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { useLogout } from '@/lib/auth'
import type { IconName } from '@/lib/icons'
import type { User } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Brand } from './Brand'
import { CourtStrip } from './court/CourtStrip'
import { Icon } from './Icon'
import { Modal } from './ui'

type Item = { href: string; label: string; short?: string; icon: IconName }

const MAIN: Item[] = [
  { href: '/', label: 'Visão geral', short: 'Início', icon: 'home' },
  { href: '/jogos', label: 'Meus jogos', short: 'Jogos', icon: 'tennis' },
  { href: '/classificacao', label: 'Classificação', short: 'Tabela', icon: 'ranking' },
  { href: '/chave', label: 'Chave', icon: 'cup' },
]
const EXTRA: Item[] = [
  { href: '/regulamento', label: 'Regulamento', icon: 'rules' },
  { href: '/perfil', label: 'Meu perfil', icon: 'user' },
]
const ADMIN: Item = { href: '/admin', label: 'Organização', icon: 'admin' }

const isActive = (path: string, href: string) => (href === '/' ? path === '/' : path.startsWith(href))

export function AppShell({ user, children }: { user: User; children: React.ReactNode }) {
  const path = usePathname()
  const logout = useLogout()
  const [menu, setMenu] = useState(false)
  const desktop = [...MAIN, EXTRA[0], ...(user.role === 'admin' ? [ADMIN] : [])]
  const sheet = [...EXTRA, ...(user.role === 'admin' ? [ADMIN] : [])]

  return (
    // --nav-h: altura da barra de abas no celular (a quadra fica logo acima dela)
    <div className="min-h-screen [--nav-h:64px] md:[--nav-h:0px]">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2">
        Pular para o conteúdo
      </a>
      <header className="sticky top-0 z-40 border-b border-olive/30 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <Brand />
          <nav className="hidden items-center gap-1 md:flex" aria-label="Principal">
            {desktop.map((n) => (
              <Link key={n.href} href={n.href} aria-current={isActive(path, n.href) ? 'page' : undefined}
                className={cn('rounded-md px-3 py-1.5 text-[15px] font-semibold transition-colors',
                  isActive(path, n.href) ? 'bg-lime/80 text-accent-foreground' : 'text-ink/80 hover:bg-olive-soft dark:text-foreground/80')}>
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-1">
            <Link href="/perfil" className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-semibold hover:bg-muted">
              <Icon name="user" className="h-6 w-6 text-court" />
              <span className="hidden max-w-[9rem] truncate sm:inline">{user.display_name}</span>
            </Link>
            <button onClick={logout} className="hidden rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground md:block" aria-label="Sair">
              <Icon name="logout" />
            </button>
          </div>
        </div>
      </header>

      <main id="conteudo" className="mx-auto max-w-6xl px-4 pt-6"
        style={{ paddingBottom: 'calc(var(--court-h, 0px) + var(--nav-h) + 3.5rem)' }}>
        {children}
      </main>

      <CourtStrip />

      {/* abas no celular */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid h-16 grid-cols-5 border-t border-olive/30 bg-background/95 backdrop-blur md:hidden"
        aria-label="Principal">
        {MAIN.map((n) => {
          const active = isActive(path, n.href)
          return (
            <Link key={n.href} href={n.href} aria-current={active ? 'page' : undefined}
              className="flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold">
              <span className={cn('flex h-7 w-12 items-center justify-center rounded-full transition-colors',
                active ? 'bg-lime/80 text-accent-foreground' : 'text-ink/70 dark:text-foreground/70')}>
                <Icon name={n.icon} className="h-5 w-5" />
              </span>
              <span className={active ? 'text-ink dark:text-foreground' : 'text-muted-foreground'}>{n.short ?? n.label}</span>
            </Link>
          )
        })}
        <button onClick={() => setMenu(true)} className="flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold text-muted-foreground">
          <span className="flex h-7 w-12 items-center justify-center"><Icon name="layers" className="h-5 w-5" /></span>
          Mais
        </button>
      </nav>

      <Modal open={menu} onClose={() => setMenu(false)} title="Mais">
        <ul className="space-y-1">
          {sheet.map((n) => (
            <li key={n.href}>
              <Link href={n.href} onClick={() => setMenu(false)}
                className="flex items-center gap-3 rounded-md px-3 py-3 font-semibold hover:bg-muted">
                <Icon name={n.icon} className="text-court" /> {n.label}
              </Link>
            </li>
          ))}
          <li>
            <button onClick={logout} className="flex w-full items-center gap-3 rounded-md px-3 py-3 font-semibold text-destructive hover:bg-muted">
              <Icon name="logout" /> Sair
            </button>
          </li>
        </ul>
      </Modal>
    </div>
  )
}
