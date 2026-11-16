import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@/lib/utils'

/** Marca no cabeçalho: círculo do macaco + palavra com o "DU" em verde. */
export function Brand({ className, href = '/' }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn('group flex items-center gap-2.5', className)} aria-label="Duvis Cup — início">
      <Image src="/brand/duvis-mark.png" alt="" width={36} height={36} priority
        className="h-9 w-9 transition-transform duration-300 group-hover:-rotate-6" />
      <span className="font-display text-[1.35rem] font-semibold leading-none tracking-[0.04em]">
        <span className="text-court">DU</span>VIS CUP
      </span>
    </Link>
  )
}

/** Logo completa (login, convite). Versão clara/escura conforme o tema. */
export function FullLogo({ className }: { className?: string }) {
  return (
    <>
      <Image src="/brand/duvis-cup-logo.png" alt="Duvis Cup" width={960} height={376} priority
        className={cn('h-auto dark:hidden', className)} />
      <Image src="/brand/duvis-cup-logo-dark.png" alt="Duvis Cup" width={960} height={376} priority
        className={cn('hidden h-auto dark:block', className)} />
    </>
  )
}
