import type { Metadata, Viewport } from 'next'
import { Fraunces, Public_Sans, Silkscreen } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

// Tipografia
// - Fraunces: títulos e números grandes (serifada robusta, conversa com a logo)
// - Public Sans: interface, tabelas e formulários (neutra, números tabulares)
// - Silkscreen: detalhes em pixel (rótulos curtos e placar) — nunca em texto corrido
const display = Fraunces({
  subsets: ['latin'], variable: '--font-display', display: 'swap',
  axes: ['SOFT', 'opsz'],
})
const sans = Public_Sans({ subsets: ['latin'], variable: '--font-sans', display: 'swap' })
const pixel = Silkscreen({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-pixel', display: 'swap' })

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://duviscup.com.br'),
  title: { default: 'Duvis Cup', template: '%s · Duvis Cup' },
  description: 'A liga de tênis da nossa turma.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F6EFDF' },
    { media: '(prefers-color-scheme: dark)', color: '#0D1A15' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${sans.variable} ${pixel.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
