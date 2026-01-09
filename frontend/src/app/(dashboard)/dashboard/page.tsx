'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'
import { playerApi, leagueApi, matchApi } from '@/lib/api'
import { Users, Trophy, Swords, TrendingUp } from 'lucide-react'

export default function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState({
    players: 0,
    leagues: 0,
    matches: 0,
    pendingMatches: 0,
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [playersRes, leaguesRes, matchesRes, pendingRes] = await Promise.all([
          playerApi.list({ limit: 1 }),
          leagueApi.list({ limit: 1 }),
          matchApi.list({ limit: 1 }),
          matchApi.list({ status: 'pending', limit: 1 }),
        ])

        setStats({
          players: playersRes.data.length || 0,
          leagues: leaguesRes.data.length || 0,
          matches: matchesRes.data.length || 0,
          pendingMatches: pendingRes.data.length || 0,
        })
      } catch (error) {
        console.error('Failed to fetch stats:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [])

  const statCards = [
    {
      title: 'Jogadores',
      value: stats.players,
      description: 'Total cadastrados',
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Ligas',
      value: stats.leagues,
      description: 'Ativas',
      icon: Trophy,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
    },
    {
      title: 'Partidas',
      value: stats.matches,
      description: 'Total registradas',
      icon: Swords,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Pendentes',
      value: stats.pendingMatches,
      description: 'Aguardando confirmacao',
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Bem-vindo de volta, {user?.full_name || 'Usuario'}!
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {card.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${card.bgColor}`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {isLoading ? '...' : card.value}
              </div>
              <p className="text-xs text-gray-500 mt-1">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ultimas Partidas</CardTitle>
            <CardDescription>Resultados recentes da liga</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500 text-sm">
              Nenhuma partida registrada ainda.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Proximos Jogos</CardTitle>
            <CardDescription>Partidas agendadas</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500 text-sm">
              Nenhum jogo agendado.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
