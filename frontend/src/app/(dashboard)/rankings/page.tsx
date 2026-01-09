'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { leagueApi, rankingApi } from '@/lib/api'
import { League, Ranking } from '@/types'
import { Medal } from 'lucide-react'

export default function RankingsPage() {
  const [leagues, setLeagues] = useState<League[]>([])
  const [selectedLeague, setSelectedLeague] = useState<string | null>(null)
  const [ranking, setRanking] = useState<Ranking[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchLeagues = async () => {
      try {
        const response = await leagueApi.list()
        setLeagues(response.data)
        if (response.data.length > 0) {
          setSelectedLeague(response.data[0].id)
        }
      } catch (error) {
        console.error('Failed to fetch leagues:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchLeagues()
  }, [])

  useEffect(() => {
    const fetchRanking = async () => {
      if (!selectedLeague) return

      try {
        const response = await rankingApi.getLeagueRanking(selectedLeague)
        setRanking(response.data)
      } catch (error) {
        console.error('Failed to fetch ranking:', error)
      }
    }

    fetchRanking()
  }, [selectedLeague])

  const getMedalColor = (position: number) => {
    switch (position) {
      case 1: return 'text-yellow-500'
      case 2: return 'text-gray-400'
      case 3: return 'text-orange-600'
      default: return 'text-gray-300'
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Rankings</h1>
        <p className="text-gray-600 mt-1">Classificacao dos jogadores por liga</p>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
        </div>
      ) : leagues.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Medal className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Nenhuma liga criada ainda.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex gap-2 flex-wrap">
            {leagues.map((league) => (
              <button
                key={league.id}
                onClick={() => setSelectedLeague(league.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedLeague === league.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {league.name}
              </button>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Classificacao</CardTitle>
            </CardHeader>
            <CardContent>
              {ranking.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  Nenhum jogador nesta liga ainda.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-semibold text-gray-600">#</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-600">Jogador</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-600">ELO</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-600">Pontos</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-600">V</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-600">D</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-600">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ranking.map((player) => (
                        <tr key={player.player_id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div className="flex items-center">
                              {player.position <= 3 && (
                                <Medal className={`h-5 w-5 mr-1 ${getMedalColor(player.position)}`} />
                              )}
                              <span className="font-semibold">{player.position}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-medium">{player.player_name}</td>
                          <td className="py-3 px-4 text-center font-mono">{player.elo_rating}</td>
                          <td className="py-3 px-4 text-center">{player.points}</td>
                          <td className="py-3 px-4 text-center text-green-600">{player.wins}</td>
                          <td className="py-3 px-4 text-center text-red-600">{player.losses}</td>
                          <td className="py-3 px-4 text-center">{player.win_rate}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
