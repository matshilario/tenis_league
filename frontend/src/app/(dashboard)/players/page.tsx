'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { playerApi } from '@/lib/api'
import { Player } from '@/types'
import { Plus, UserCircle } from 'lucide-react'

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const response = await playerApi.list()
        setPlayers(response.data)
      } catch (error) {
        console.error('Failed to fetch players:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPlayers()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Jogadores</h1>
          <p className="text-gray-600 mt-1">Gerencie os jogadores da sua liga</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Novo Jogador
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
        </div>
      ) : players.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <UserCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Nenhum jogador cadastrado ainda.</p>
            <Button className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Cadastrar Primeiro Jogador
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {players.map((player) => (
            <Card key={player.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-blue-600 font-semibold">
                      {player.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <CardTitle className="text-lg">{player.name}</CardTitle>
                    <p className="text-sm text-gray-500 capitalize">{player.category}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-600">
                  {player.email && <p>{player.email}</p>}
                  {player.phone && <p>{player.phone}</p>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
