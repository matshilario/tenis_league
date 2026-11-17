import { matchImage, PORTRAIT } from '@/lib/og/cards'
import { fetchPublic } from '@/lib/og/fetch'
import type { MatchCardData } from '@/lib/types'

export const runtime = 'nodejs'

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const card = await fetchPublic<MatchCardData>(`/public/cards/match/${params.id}`)
  if (!card) return new Response('Não encontrado', { status: 404 })
  const img = await matchImage(card, PORTRAIT)
  if (new URL(req.url).searchParams.has('baixar')) {
    img.headers.set('Content-Disposition', `attachment; filename="resultado-duvis-cup.png"`)
  }
  return img
}
