import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ShareCard } from '@/components/sponsors/ShareCard'
import { fetchPublic } from '@/lib/og/fetch'
import type { ChampionCard } from '@/lib/types'

const load = (id: string) => fetchPublic<ChampionCard>(`/public/cards/champion/${id}`)

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const c = await load(params.id)
  if (!c) return { title: 'Campeão' }
  const sp = c.sponsors.map((s) => s.company).join(', ')
  return {
    title: `${c.champion}, campeão da ${c.season}`,
    description: `${c.category}${sp ? ` · Oferecimento: ${sp}` : ''}`,
  }
}

export default async function Page({ params }: { params: { id: string } }) {
  const c = await load(params.id)
  if (!c) notFound()
  return <ShareCard image={`/compartilhar/campeao/${params.id}/imagem`}
    title={`${c.champion}, campeão da ${c.season}`}
    text={`👑 ${c.champion} é o campeão da ${c.season} (${c.category})!`} />
}
