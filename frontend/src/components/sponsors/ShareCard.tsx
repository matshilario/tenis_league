'use client'

import { useEffect, useState } from 'react'
import { FullLogo } from '@/components/Brand'
import { CourtStrip } from '@/components/court/CourtStrip'
import { Icon } from '@/components/Icon'
import { buttonClass } from '@/components/ui'

/** Página pública de um cartão: prévia da imagem e botões de compartilhar/baixar. */
export function ShareCard({ image, title, text }: { image: string; title: string; text: string }) {
  const [copied, setCopied] = useState(false)
  // a URL só existe no navegador: lida depois da hidratação (no servidor o link sairia vazio)
  const [url, setUrl] = useState('')
  useEffect(() => setUrl(window.location.href), [])

  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url })
        return
      }
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* cancelado */ }
  }

  return (
    <div className="flex min-h-screen flex-col items-center px-4 pt-8"
      style={{ paddingBottom: 'calc(var(--court-h, 0px) + 2.5rem)' }}>
      <a href="/" aria-label="Duvis Cup"><FullLogo className="w-[180px]" /></a>
      <h1 className="sr-only">{title}</h1>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image} alt={title} width={1080} height={1350}
        className="mt-6 h-auto w-full max-w-[420px] rounded-lg shadow-[0_24px_60px_-28px_rgb(0_0_0/0.55)]" />
      <div className="mt-6 flex w-full max-w-[420px] flex-wrap gap-2">
        <a className={buttonClass('accent', 'lg') + ' flex-1'} target="_blank" rel="noopener noreferrer"
          href={`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`}>
          <Icon name="chat" className="h-5 w-5" /> WhatsApp
        </a>
        <button onClick={share} className={buttonClass('secondary', 'lg') + ' flex-1'}>
          <Icon name="share" className="h-5 w-5" /> {copied ? 'Link copiado!' : 'Compartilhar'}
        </button>
        <a href={`${image}?baixar`} download className={buttonClass('ghost', 'lg') + ' w-full'}>
          <Icon name="download" className="h-5 w-5" /> Baixar imagem
        </a>
      </div>
      <CourtStrip />
    </div>
  )
}
