'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { tournamentApi } from '@/lib/api'
import { Tournament } from '@/types'
import { Plus, Trophy, Users, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const response = await tournamentApi.list()
        setTournaments(response.data)
      } catch (error) {
        console.error('Failed to fetch tournaments:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTournaments()
  }, [])

  const getStatusBadge = (status: string) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-800',
      registration: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-green-100 text-green-800',
      completed: 'bg-purple-100 text-purple-800',
    }
    const labels = {
      draft: 'Rascunho',
      registration: 'Inscricoes Abertas',
      in_progress: 'Em Andamento',
      completed: 'Finalizado',
    }
    return (
      <span className={`text-xs px-2 py-1 rounded-full ${styles[status as keyof typeof styles] || 'bg-gray-100'}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Torneios</h1>
          <p className="text-gray-600 mt-1">Gerencie torneios eliminatorios</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Novo Torneio
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
        </div>
      ) : tournaments.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Nenhum torneio criado ainda.</p>
            <Button className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeiro Torneio
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tournaments.map((tournament) => (
            <Link key={tournament.id} href={`/dashboard/tournaments/${tournament.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{tournament.name}</CardTitle>
                    {getStatusBadge(tournament.status)}
                  </div>
                  <CardDescription>
                    {tournament.format === 'single_elimination' ? 'Eliminacao Simples' : 'Eliminacao Dupla'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center">
                      <Users className="h-4 w-4 mr-2" />
                      <span>{tournament.size} jogadores</span>
                    </div>
                    {tournament.start_date && (
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2" />
                        <span>
                          {format(new Date(tournament.start_date), "d 'de' MMM", { locale: ptBR })}
                        </span>
                      </div>
                    )}
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
