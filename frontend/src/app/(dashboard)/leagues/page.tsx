'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { leagueApi } from '@/lib/api'
import { League } from '@/types'
import { Plus, Trophy, Users } from 'lucide-react'

export default function LeaguesPage() {
  const [leagues, setLeagues] = useState<League[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchLeagues = async () => {
      try {
        const response = await leagueApi.list()
        setLeagues(response.data)
      } catch (error) {
        console.error('Failed to fetch leagues:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchLeagues()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Ligas</h1>
          <p className="text-gray-600 mt-1">Gerencie suas ligas e rankings</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nova Liga
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
        </div>
      ) : leagues.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Nenhuma liga criada ainda.</p>
            <Button className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeira Liga
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {leagues.map((league) => (
            <Link key={league.id} href={`/dashboard/leagues/${league.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    {league.name}
                  </CardTitle>
                  <CardDescription>
                    Sistema: {league.ranking_system === 'elo' ? 'ELO' : 'Pontos'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">{league.description || 'Sem descricao'}</p>
                  <div className="mt-4 flex items-center text-sm text-gray-500">
                    <Users className="h-4 w-4 mr-1" />
                    <span>Formato: {league.match_format === 'best_of_3' ? 'Melhor de 3' : 'Melhor de 5'}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
