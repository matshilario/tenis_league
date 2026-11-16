import { RevealTitle } from './RevealTitle'

export function PageHeader({ eyebrow, title, children }: {
  eyebrow?: string; title: string; children?: React.ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {eyebrow && (
          <p className="eyebrow mb-2 flex items-center gap-3">
            {eyebrow}
            <span className="h-px w-16 bg-olive/60" aria-hidden="true" />
          </p>
        )}
        <RevealTitle text={title} className="text-title font-bold text-ink dark:text-foreground" />
      </div>
      {children}
    </div>
  )
}
