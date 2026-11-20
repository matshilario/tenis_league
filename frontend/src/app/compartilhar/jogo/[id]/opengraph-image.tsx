import { matchImage, OG } from '@/lib/og/cards'
import { fetchPublic } from '@/lib/og/fetch'
import type { MatchCardData } from '@/lib/types'

export const runtime = 'nodejs'
export const size = OG
export const contentType = 'image/png'
export const alt = 'Resultado da Duvis Cup'

export default async function Image({ params }: { params: { id: string } }) {
  const card = await fetchPublic<MatchCardData>(`/public/cards/match/${params.id}`)
  if (!card) return new Response('Não encontrado', { status: 404 })
  return matchImage(card, OG)
}
