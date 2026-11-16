import { FullLogo } from './Brand'
import { CourtStrip } from './court/CourtStrip'

/** Moldura das telas sem login: logo, cartão e a quadra no rodapé. */
export function AuthFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center px-4 pt-10 sm:pt-16"
      style={{ paddingBottom: 'calc(var(--court-h, 0px) + 3rem)' }}>
      <FullLogo className="w-[min(78vw,340px)]" />
      <div className="mt-8 w-full max-w-sm">{children}</div>
      <CourtStrip />
    </div>
  )
}
