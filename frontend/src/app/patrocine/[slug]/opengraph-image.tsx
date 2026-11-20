import { OG, pitchImage } from '@/lib/og/cards'
import { fetchPublic } from '@/lib/og/fetch'
import type { SponsorPage } from '@/lib/types'

export const runtime = 'nodejs'
export const size = OG
export const contentType = 'image/png'
export const alt = 'Patrocine a Duvis Cup'

export default async function Image({ params }: { params: { slug: string } }) {
  const page = await fetchPublic<SponsorPage>(`/public/sponsor/${params.slug}`)
  return pitchImage(page?.season_name ?? 'Duvis Cup', OG)
}
