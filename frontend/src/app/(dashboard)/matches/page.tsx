'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { matchApi } from '@/lib/api'
import { MatchWithPlayers } from '@/types'
import { Plus, Swords } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function MatchesPage() {
  const [matches, setMatches] = useState<MatchWithPlayers[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const response = await matchApi.list()
        setMatches(response.data)
      } catch (error) {
        console.error('Failed to fetch matches:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchMatches()
  }, [])

  const formatScore = (score: { sets: number[][] } | null) => {
    if (!score?.sets) return '-'
    return score.sets.map(set => `${set[0]}-${set[1]}`).join(' ')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'disputed': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Partidas</h1>
          <p className="text-gray-600 mt-1">Historico e registro de partidas</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nova Partida
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
        </div>
      ) : matches.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Swords className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Nenhuma partida registrada ainda.</p>
            <Button className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Registrar Primeira Partida
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {matches.map((match) => (
            <Card key={match.id} className="hover:shadow-md transition-shadow">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4">
                      <div className="flex-1 text-right">
                        <span className={`font-semibold ${match.winner_id === match.player1_id ? 'text-green-600' : ''}`}>
                          {match.player1_name}
                        </span>
                      </div>
                      <div className="text-center px-4">
                        <span className="text-lg font-mono font-bold">
                          {formatScore(match.score)}
                        </span>
                      </div>
                      <div className="flex-1">
                        <span className={`font-semibold ${match.winner_id === match.player2_id ? 'text-green-600' : ''}`}>
                          {match.player2_name}
                        </span>
                      </div>
                    </div>
                    <div className="text-center mt-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(match.status)}`}>
                        {match.status === 'confirmed' ? 'Confirmada' :
                         match.status === 'pending' ? 'Pendente' :
                         match.status === 'disputed' ? 'Disputada' : match.status}
                      </span>
                      {match.played_at && (
                        <span className="text-xs text-gray-500 ml-2">
                          {format(new Date(match.played_at), "d 'de' MMM 'de' yyyy", { locale: ptBR })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
