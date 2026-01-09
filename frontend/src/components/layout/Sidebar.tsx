'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  Trophy,
  Swords,
  Medal,
  Calendar,
  Settings,
  LogOut,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Jogadores', href: '/dashboard/players', icon: Users },
  { name: 'Ligas', href: '/dashboard/leagues', icon: Trophy },
  { name: 'Partidas', href: '/dashboard/matches', icon: Swords },
  { name: 'Rankings', href: '/dashboard/rankings', icon: Medal },
  { name: 'Torneios', href: '/dashboard/tournaments', icon: Trophy },
  { name: 'Agenda', href: '/dashboard/schedule', icon: Calendar },
]

export function Sidebar() {
  const pathname = usePathname()
  const { logout, user } = useAuth()

  return (
    <div className="flex h-full w-64 flex-col bg-gray-900">
      <div className="flex h-16 items-center justify-center border-b border-gray-800">
        <Link href="/dashboard" className="text-xl font-bold text-white">
          Tennis League
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-2 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                isActive
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              )}
            >
              <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-gray-800 p-4">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="h-8 w-8 rounded-full bg-gray-700 flex items-center justify-center">
              <span className="text-sm font-medium text-white">
                {user?.full_name?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
          </div>
          <div className="ml-3 min-w-0 flex-1">
            <p className="text-sm font-medium text-white truncate">
              {user?.full_name || 'Usuario'}
            </p>
            <p className="text-xs text-gray-400 truncate">
              {user?.role || 'player'}
            </p>
          </div>
          <button
            onClick={logout}
            className="ml-2 p-2 text-gray-400 hover:text-white transition-colors"
            title="Sair"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
