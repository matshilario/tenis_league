'use client'

import { Bracket } from '@/components/Bracket'
import { CategoryPicker } from '@/components/CategoryPicker'
import { PageHeader } from '@/components/PageHeader'
import { Spinner } from '@/components/ui'
import { useCategory } from '@/lib/useCategory'

export default function BracketPage() {
  const { categories, categoryId, choose, detail } = useCategory()
  if (detail.isLoading || !detail.data) return <Spinner />
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Mata-mata" title="Semifinais e final">
        <CategoryPicker categories={categories} value={categoryId} onChange={choose} />
      </PageHeader>
      <Bracket matches={detail.data.matches} champion={detail.data.champion} />
      <p className="text-xs text-muted-foreground">
        {detail.data.category.n_groups === 2
          ? 'Cruzamento: 1º do A × 2º do B e 1º do B × 2º do A.'
          : 'Cruzamento: 1º × 4º e 2º × 3º.'} Sem disputa de 3º lugar.
      </p>
    </div>
  )
}
