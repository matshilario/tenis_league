import { ICONS, type IconName } from '@/lib/icons'
import { cn } from '@/lib/utils'

/** Ícones Solar (Iconify) embutidos — ver scripts/build-icons.mjs. */
export function Icon({ name, className, label }: { name: IconName; className?: string; label?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn('inline-block h-5 w-5 shrink-0', className)}
      role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}
      dangerouslySetInnerHTML={{ __html: ICONS[name] }} />
  )
}
