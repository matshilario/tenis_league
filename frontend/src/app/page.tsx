import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Tennis League
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Gerencie suas ligas de tenis, partidas, torneios e rankings de forma simples e profissional.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-16">
          <Card>
            <CardHeader>
              <CardTitle>Ranking Automatico</CardTitle>
              <CardDescription>
                Sistema ELO ou por pontos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Calculo automatico de ranking apos cada partida, com historico completo de evolucao.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Torneios</CardTitle>
              <CardDescription>
                Chaves eliminatorias
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Crie torneios com geracao automatica de chaves, seeding e acompanhamento de brackets.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Agendamento</CardTitle>
              <CardDescription>
                Organize suas partidas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Sistema de propostas de horarios com confirmacao dos jogadores.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="text-center space-x-4">
          <Link href="/register">
            <Button size="lg">
              Criar Organizacao
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="outline" size="lg">
              Entrar
            </Button>
          </Link>
        </div>
      </div>
    </main>
  )
}
