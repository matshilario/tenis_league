import { championImage, OG } from '@/lib/og/cards'
import { fetchPublic } from '@/lib/og/fetch'
import type { ChampionCard } from '@/lib/types'

export const runtime = 'nodejs'
export const size = OG
export const contentType = 'image/png'
export const alt = 'Cartão do campeão da Duvis Cup'

export default async function Image({ params }: { params: { id: string } }) {
  const card = await fetchPublic<ChampionCard>(`/public/cards/champion/${params.id}`)
  if (!card) return new Response('Não encontrado', { status: 404 })
  return championImage(card, OG)
}
