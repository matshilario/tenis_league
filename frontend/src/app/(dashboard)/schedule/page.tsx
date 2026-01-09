'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { scheduleApi } from '@/lib/api'
import { ScheduleWithPlayers } from '@/types'
import { Plus, Calendar, Clock, MapPin } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function SchedulePage() {
  const [schedules, setSchedules] = useState<ScheduleWithPlayers[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        const response = await scheduleApi.list()
        setSchedules(response.data)
      } catch (error) {
        console.error('Failed to fetch schedules:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchSchedules()
  }, [])

  const getStatusBadge = (status: string) => {
    const styles = {
      proposed: 'bg-yellow-100 text-yellow-800',
      accepted: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      completed: 'bg-blue-100 text-blue-800',
      cancelled: 'bg-gray-100 text-gray-800',
    }
    const labels = {
      proposed: 'Proposto',
      accepted: 'Aceito',
      rejected: 'Rejeitado',
      completed: 'Concluido',
      cancelled: 'Cancelado',
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
          <h1 className="text-3xl font-bold text-gray-900">Agenda</h1>
          <p className="text-gray-600 mt-1">Gerencie o agendamento de partidas</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Agendar Partida
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
        </div>
      ) : schedules.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Nenhuma partida agendada ainda.</p>
            <Button className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Agendar Primeira Partida
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {schedules.map((schedule) => (
            <Card key={schedule.id} className="hover:shadow-md transition-shadow">
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{schedule.player1_name}</span>
                      <span className="text-gray-400">vs</span>
                      <span className="font-semibold">{schedule.player2_name}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {format(new Date(schedule.proposed_datetime), "d 'de' MMMM", { locale: ptBR })}
                      </div>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {format(new Date(schedule.proposed_datetime), "HH:mm")}
                      </div>
                      {schedule.location && (
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 mr-1" />
                          {schedule.location}
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      Proposto por {schedule.proposer_name}
                    </p>
                  </div>
                  <div>
                    {getStatusBadge(schedule.status)}
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
