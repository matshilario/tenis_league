import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ShareCard } from '@/components/sponsors/ShareCard'
import { fetchPublic } from '@/lib/og/fetch'
import type { MatchCardData } from '@/lib/types'

const load = (id: string) => fetchPublic<MatchCardData>(`/public/cards/match/${id}`)

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const c = await load(params.id)
  if (!c) return { title: 'Resultado' }
  return { title: `${c.player1} × ${c.player2}`, description: `${c.score} · ${c.category} · ${c.stage}` }
}

export default async function Page({ params }: { params: { id: string } }) {
  const c = await load(params.id)
  if (!c) notFound()
  return <ShareCard image={`/compartilhar/jogo/${params.id}/imagem`} title={`${c.player1} × ${c.player2}`}
    text={`🎾 ${c.player1} × ${c.player2}: ${c.score} (${c.category}, ${c.stage})`} />
}
