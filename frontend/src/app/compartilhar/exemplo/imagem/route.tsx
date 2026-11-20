import { championImage, EXAMPLE, PORTRAIT } from '@/lib/og/cards'

export const runtime = 'nodejs'

/** Cartão do campeão de exemplo (landing de patrocínio), com "sua logo aqui". */
export async function GET() {
  const img = await championImage(EXAMPLE, PORTRAIT, { placeholder: true })
  img.headers.set('Cache-Control', 'public, max-age=86400')
  return img
}
