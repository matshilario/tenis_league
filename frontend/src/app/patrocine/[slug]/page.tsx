import type { Metadata } from 'next'
import { SponsorLanding } from '@/components/sponsors/SponsorLanding'
import { fetchPublic } from '@/lib/og/fetch'
import type { SponsorPage } from '@/lib/types'

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const page = await fetchPublic<SponsorPage>(`/public/sponsor/${params.slug}`)
  const title = page ? `Patrocine a ${page.season_name}` : 'Patrocine a Duvis Cup'
  return {
    title,
    description: 'Juízo a gente perdeu. A paixão pelo tênis ficou inteira. Escolha seu primata e estampe sua marca no torneio.',
    openGraph: { title, type: 'website' },
  }
}

export default function Page({ params }: { params: { slug: string } }) {
  return <SponsorLanding slug={params.slug} />
}
