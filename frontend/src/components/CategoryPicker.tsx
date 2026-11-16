'use client'

import type { Category } from '@/lib/types'
import { cn } from '@/lib/utils'

export function CategoryPicker({ categories, value, onChange }: {
  categories: Category[]; value: string | null; onChange: (id: string) => void
}) {
  if (categories.length < 2) return null
  return (
    <div className="flex flex-wrap gap-1 rounded-md bg-muted p-1" role="tablist" aria-label="Categoria">
      {categories.map((c) => (
        <button key={c.id} role="tab" aria-selected={c.id === value} onClick={() => onChange(c.id)}
          className={cn('rounded px-3 py-1 text-sm font-semibold transition-colors',
            c.id === value ? 'bg-card text-ink shadow-card dark:text-foreground' : 'text-muted-foreground hover:text-foreground')}>
          {c.name}
        </button>
      ))}
    </div>
  )
}
