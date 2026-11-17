/* eslint-disable @next/next/no-img-element, jsx-a11y/alt-text */
/**
 * Cartões de compartilhamento (campeão, resultado e "patrocine"), renderizados com
 * next/og (satori). Regra do satori: todo bloco com mais de um filho precisa de display flex.
 */
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ImageResponse } from 'next/og'
import { TOOL_PAL, TOOLS, TROPHY, TROPHY_PAL } from '@/lib/pixelTools'
import type { ChampionCard, MatchCardData, PublicSponsor } from '@/lib/types'
import { API_ORIGIN } from './fetch'

const C = {
  deep: '#114530', paper: '#f6efdf', cream: '#fcf8ee', lime: '#d3db3b',
  ink: '#10372a', clay: '#c48a55', muted: 'rgba(246,239,223,0.72)',
}

export type Size = { width: number; height: number }
export const OG: Size = { width: 1200, height: 630 }
export const PORTRAIT: Size = { width: 1080, height: 1350 }

async function assets() {
  // arquivos em public/og (vão para a imagem de produção junto com public/)
  const load = (f: string) => readFile(join(process.cwd(), 'public/og', f))
  const [fraunces, frauncesMed, sans, pixel, mark] = await Promise.all([
    load('Fraunces-Bold.ttf'), load('Fraunces-Medium.ttf'), load('PublicSans-SemiBold.ttf'),
    load('Silkscreen.ttf'), load('mark.png'),
  ])
  return {
    markSrc: `data:image/png;base64,${mark.toString('base64')}`,
    fonts: [
      { name: 'Fraunces', data: fraunces, weight: 700 as const, style: 'normal' as const },
      { name: 'Fraunces', data: frauncesMed, weight: 500 as const, style: 'normal' as const },
      { name: 'Public Sans', data: sans, weight: 600 as const, style: 'normal' as const },
      { name: 'Silkscreen', data: pixel, weight: 400 as const, style: 'normal' as const },
    ],
  }
}

/** Pixel art com divs (o satori não tem canvas). */
function Pixels({ grid, pal, px: raw }: { grid: readonly string[]; pal: Record<string, string>; px: number }) {
  const px = Math.max(1, Math.round(raw)) // inteiro: sem frestas entre os pixels
  const w = Math.max(...grid.map((r) => r.length))
  const cells: React.ReactNode[] = []
  grid.forEach((row, y) => [...row].forEach((ch, x) => {
    const c = pal[ch]
    if (c) cells.push(<div key={`${x}-${y}`} style={{ position: 'absolute', left: x * px, top: y * px, width: px, height: px, background: c }} />)
  }))
  return <div style={{ display: 'flex', position: 'relative', width: w * px, height: grid.length * px }}>{cells}</div>
}

function Header({ markSrc, label, k }: { markSrc: string; label: string; k: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 18 * k }}>
      <img src={markSrc} width={64 * k} height={64 * k} />
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', fontFamily: 'Fraunces', fontWeight: 700, fontSize: 34 * k, color: C.paper, letterSpacing: 2 }}>
          <span style={{ color: C.lime }}>DU</span>VIS CUP
        </div>
        <div style={{ fontFamily: 'Silkscreen', fontSize: 18 * k, color: C.muted, textTransform: 'uppercase' }}>{label}</div>
      </div>
    </div>
  )
}

function Sponsors({ list, k }: { list: PublicSponsor[]; k: number }) {
  const withLogo = list.filter((s) => s.logo_url).slice(0, 6)
  if (!withLogo.length) {
    return <div style={{ display: 'flex', fontFamily: 'Silkscreen', fontSize: 18 * k, color: C.muted }}>duviscup.com.br</div>
  }
  const master = withLogo[0].weight >= 3 ? withLogo[0] : null
  const rest = master ? withLogo.slice(1) : withLogo
  const tile = (s: PublicSponsor, w: number, h: number) => (
    <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.cream,
      borderRadius: 12 * k, width: w, height: h, padding: 10 * k }}>
      <img src={`${API_ORIGIN}${s.logo_url}`} style={{ maxWidth: w - 20 * k, maxHeight: h - 20 * k, objectFit: 'contain' }} />
    </div>
  )
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 * k }}>
      <div style={{ fontFamily: 'Silkscreen', fontSize: 16 * k, color: C.muted, textTransform: 'uppercase' }}>
        {master ? `Apresentado por ${master.company}` : 'Oferecimento'}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 * k, flexWrap: 'wrap' }}>
        {master && tile(master, 300 * k, 110 * k)}
        {rest.map((s) => tile(s, (s.weight >= 2 ? 190 : 150) * k, (s.weight >= 2 ? 82 : 66) * k))}
      </div>
    </div>
  )
}

/** Fundo de quadra: contorno, faixa de saibro embaixo; `art` vai à direita (deitado) ou no topo (em pé). */
function Frame({ size, art, children }: { size: Size; art?: React.ReactNode; children: React.ReactNode }) {
  const k = size.width / 1200
  const tall = size.height > size.width
  return (
    <div style={{ width: size.width, height: size.height, display: 'flex', flexDirection: tall ? 'column' : 'row',
      background: C.deep, padding: 64 * k, position: 'relative', color: C.paper, fontFamily: 'Public Sans' }}>
      <div style={{ position: 'absolute', left: 40 * k, right: 40 * k, top: 40 * k, bottom: 40 * k, display: 'flex',
        border: '3px solid rgba(246,239,223,0.12)' }} />
      <div style={{ position: 'absolute', left: 40 * k, right: 40 * k, top: tall ? '42%' : '50%', height: 3, display: 'flex',
        background: 'rgba(246,239,223,0.06)' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 14 * k, display: 'flex', background: C.clay }} />
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1 }}>{children}</div>
      {art && (
        <div style={tall
          ? { display: 'flex', position: 'absolute', right: 72 * k, top: 170 * k }
          : { display: 'flex', alignItems: 'center', justifyContent: 'center', width: 360 * k }}>{art}</div>
      )}
    </div>
  )
}

export async function championImage(card: ChampionCard, size: Size) {
  const { markSrc, fonts } = await assets()
  const k = size.width / 1200
  const tall = size.height > size.width
  const nameSize = Math.min(tall ? 210 : 120, Math.floor((tall ? 2200 : 1500) / Math.max(card.champion.length, 5))) * k
  return new ImageResponse((
    <Frame size={size} art={<Pixels grid={TROPHY} pal={TROPHY_PAL} px={(tall ? 24 : 18) * k} />}>
      <Header markSrc={markSrc} label={`${card.season} · ${card.category}`} k={k} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 * k }}>
        <div style={{ display: 'flex', alignSelf: 'flex-start', background: C.lime, color: C.ink, fontFamily: 'Silkscreen',
          fontSize: 26 * k, padding: `${8 * k}px ${16 * k}px`, borderRadius: 8 * k }}>CAMPEÃO</div>
        <div style={{ fontFamily: 'Fraunces', fontWeight: 700, fontSize: nameSize, lineHeight: 0.95, color: C.paper,
          letterSpacing: -2 }}>{card.champion}</div>
        {card.runner_up && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 * k, alignItems: 'baseline', fontSize: 30 * k, color: C.muted }}>
            <span>venceu {card.runner_up} na final</span>
            {card.score && <span style={{ fontFamily: 'Silkscreen', color: C.lime }}>{card.score}</span>}
          </div>
        )}
      </div>
      <Sponsors list={card.sponsors} k={k} />
    </Frame>
  ), { ...size, fonts })
}

export async function matchImage(card: MatchCardData, size: Size) {
  const { markSrc, fonts } = await assets()
  const k = size.width / 1200
  const tall = size.height > size.width
  const row = (name: string, win: boolean) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20 * k }}>
      <div style={{ display: 'flex', width: 22 * k, height: 22 * k, borderRadius: 4 * k,
        background: win ? C.lime : 'transparent', border: win ? 'none' : `3px solid ${C.muted}` }} />
      <div style={{ fontFamily: 'Fraunces', fontWeight: win ? 700 : 500, fontSize: (tall ? 110 : 72) * k,
        color: win ? C.paper : C.muted, lineHeight: 1 }}>{name}</div>
    </div>
  )
  const score = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 * k, alignItems: tall ? 'flex-start' : 'center' }}>
      {card.score.split(' ').map((p, i) => (
        <div key={i} style={{ fontFamily: 'Silkscreen', fontSize: (tall ? 64 : 58) * k, color: C.lime, lineHeight: 1 }}>{p}</div>
      ))}
    </div>
  )
  return new ImageResponse((
    <Frame size={size} art={tall ? undefined : score}>
      <Header markSrc={markSrc} label={`${card.season} · ${card.category} · ${card.stage}`} k={k} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 * k }}>
        {row(card.player1, card.winner_side === 1)}
        {row(card.player2, card.winner_side === 2)}
        {tall && <div style={{ display: 'flex', marginTop: 30 * k }}>{score}</div>}
      </div>
      <Sponsors list={card.sponsors} k={k} />
    </Frame>
  ), { ...size, fonts })
}

/** Cartão "Patrocine" para a prévia do link no WhatsApp. */
export async function pitchImage(season: string, size: Size) {
  const { markSrc, fonts } = await assets()
  const k = size.width / 1200
  const art = (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 26 * k }}>
      <div style={{ display: 'flex', transform: 'rotate(-18deg)' }}><Pixels grid={TOOLS.screw} pal={TOOL_PAL} px={20 * k} /></div>
      <div style={{ display: 'flex', marginBottom: -10 * k }}><Pixels grid={TOOLS.nut} pal={TOOL_PAL} px={14 * k} /></div>
    </div>
  )
  return new ImageResponse((
    <Frame size={size} art={art}>
      <Header markSrc={markSrc} label={`Patrocine a ${season}`} k={k} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 * k }}>
        <div style={{ fontFamily: 'Fraunces', fontWeight: 700, fontSize: 76 * k, lineHeight: 0.98, letterSpacing: -2 }}>
          Perdemos uns parafusos.
        </div>
        <div style={{ fontFamily: 'Fraunces', fontWeight: 500, fontSize: 48 * k, lineHeight: 1.05, color: C.lime }}>
          A paixão pelo tênis ficou inteira.
        </div>
      </div>
      <div style={{ display: 'flex', fontFamily: 'Silkscreen', fontSize: 20 * k, color: C.muted }}>
        Cotas de patrocínio · sua marca no cartão do campeão
      </div>
    </Frame>
  ), { ...size, fonts })
}
