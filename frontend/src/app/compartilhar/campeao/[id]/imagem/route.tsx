import { championImage, PORTRAIT } from '@/lib/og/cards'
import { fetchPublic } from '@/lib/og/fetch'
import type { ChampionCard } from '@/lib/types'

export const runtime = 'nodejs'

/** Versão em pé (1080×1350) para baixar e postar no status / stories. */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const card = await fetchPublic<ChampionCard>(`/public/cards/champion/${params.id}`)
  if (!card) return new Response('Não encontrado', { status: 404 })
  const img = await championImage(card, PORTRAIT)
  if (new URL(req.url).searchParams.has('baixar')) {
    img.headers.set('Content-Disposition', `attachment; filename="campeao-duvis-cup.png"`)
  }
  return img
}
