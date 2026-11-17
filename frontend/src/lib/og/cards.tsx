/* eslint-disable @next/next/no-img-element, jsx-a11y/alt-text */
/**
 * Cartões de compartilhamento (campeão, resultado e "patrocine"), renderizados com
 * next/og (satori) sobre artes de fundo em estilo serigrafia (public/og/art, geradas
 * para a paleta da liga, sem texto). Tudo que muda — logo, nome, placar, patrocinadores —
 * é composto aqui por cima. Regra do satori: bloco com mais de um filho = display flex.
 */
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ImageResponse } from 'next/og'
import type { ChampionCard, MatchCardData, PublicSponsor } from '@/lib/types'
import { API_ORIGIN } from './fetch'

const C = {
  deep: '#114530', paper: '#f6efdf', cream: '#fcf8ee', lime: '#d3db3b', ink: '#10372a',
  clay: '#c48a55', muted: 'rgba(246,239,223,0.66)', faint: 'rgba(246,239,223,0.38)',
}

export type Size = { width: number; height: number }
export const OG: Size = { width: 1200, height: 630 }
export const PORTRAIT: Size = { width: 1080, height: 1350 }

type ArtName = 'champion-portrait' | 'champion-landscape' | 'match-portrait' | 'match-landscape'

const file = (f: string) => readFile(join(process.cwd(), 'public', f))
const dataUrl = (b: Buffer, mime: string) => `data:${mime};base64,${b.toString('base64')}`

async function assets(artName: ArtName) {
  // arquivos em public/ (vão para a imagem de produção)
  const [fraunces, frauncesMed, sans, art, logo] = await Promise.all([
    file('og/Fraunces-Bold.ttf'), file('og/Fraunces-Medium.ttf'), file('og/PublicSans-SemiBold.ttf'),
    file(`og/art/${artName}.jpg`), file('og/mark.png'),
  ])
  return {
    art: dataUrl(art, 'image/jpeg'),
    mark: dataUrl(logo, 'image/png'),
    fonts: [
      { name: 'Fraunces', data: fraunces, weight: 700 as const, style: 'normal' as const },
      { name: 'Fraunces', data: frauncesMed, weight: 500 as const, style: 'normal' as const },
      { name: 'Public Sans', data: sans, weight: 600 as const, style: 'normal' as const },
    ],
  }
}

/** Marca da liga sobre o verde: selo do macaco + DUVIS CUP com o "DU" em lima. */
function Wordmark({ mark, k = 1 }: { mark: string; k?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 * k }}>
      <img src={mark} width={62 * k} height={62 * k} />
      <div style={{ display: 'flex', fontFamily: 'Fraunces', fontWeight: 700, fontSize: 38 * k, letterSpacing: 3 * k, color: C.paper }}>
        <span style={{ color: C.lime }}>DU</span>VIS CUP
      </div>
    </div>
  )
}

const fmtDay = (d: string | null | undefined) => (d ? d.split('-').reverse().slice(0, 2).join('/') : null)

/** Fundo: a arte cobre o cartão ancorada embaixo (a quadra e o macaco ficam sempre inteiros). */
function Canvas({ size, art, artH, children }: { size: Size; art: string; artH: number; children: React.ReactNode }) {
  return (
    <div style={{ width: size.width, height: size.height, display: 'flex', position: 'relative', background: C.deep,
      color: C.paper, fontFamily: 'Public Sans' }}>
      <img src={art} width={size.width} height={artH} style={{ position: 'absolute', left: 0, top: size.height - artH }} />
      {children}
    </div>
  )
}

function Eyebrow({ children, size = 22, color = C.lime }: { children: string; size?: number; color?: string }) {
  return (
    <div style={{ display: 'flex', fontFamily: 'Public Sans', fontWeight: 600, fontSize: size, letterSpacing: size * 0.32,
      textTransform: 'uppercase', color }}>{children}</div>
  )
}

function Pill({ children, size = 20 }: { children: string; size?: number }) {
  return (
    <div style={{ display: 'flex', fontFamily: 'Public Sans', fontWeight: 600, fontSize: size, letterSpacing: size * 0.18,
      textTransform: 'uppercase', color: C.ink, background: C.lime, borderRadius: 999, padding: `${size * 0.45}px ${size * 0.9}px` }}>
      {children}
    </div>
  )
}

/** Sets lado a lado, estilo placar de transmissão: "7–6  6–4", games do vencedor do set em lima. */
function SetLine({ sets, stb, size }: { sets: number[][]; stb?: number[] | null; size: number }) {
  const all = [...sets.map((s) => ({ a: s[0], b: s[1], tb: false })), ...(stb ? [{ a: stb[0], b: stb[1], tb: true }] : [])]
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: size * 0.55 }}>
      {all.map((s, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: size * 0.12, fontFamily: 'Fraunces', fontWeight: 700,
          fontSize: s.tb ? size * 0.72 : size, lineHeight: 1 }}>
          {s.tb ? <span style={{ color: C.muted, fontWeight: 500 }}>[</span> : null}
          <span style={{ color: s.a > s.b ? C.lime : C.paper }}>{String(s.a)}</span>
          <span style={{ color: C.faint, fontWeight: 500 }}>–</span>
          <span style={{ color: s.b > s.a ? C.lime : C.paper }}>{String(s.b)}</span>
          {s.tb ? <span style={{ color: C.muted, fontWeight: 500 }}>]</span> : null}
        </div>
      ))}
    </div>
  )
}

/** Logos dos patrocinadores em placas creme (ou o espaço "sua logo aqui" no exemplo). */
function Sponsors({ list, k, placeholder }: { list: PublicSponsor[]; k: number; placeholder?: boolean }) {
  const withLogo = list.filter((s) => s.logo_url).slice(0, 4)
  const master = withLogo[0]?.weight >= 3 ? withLogo[0] : null
  const plate = (key: string, w: number, h: number, child: React.ReactNode, dashed = false) => (
    <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: w, height: h,
      padding: 10 * k, borderRadius: 14 * k, background: dashed ? 'rgba(211,219,59,0.14)' : C.cream,
      border: dashed ? `3px dashed ${C.lime}` : '0px solid transparent' }}>{child}</div>
  )
  if (!placeholder && !withLogo.length) return null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 * k }}>
      <Eyebrow size={17 * k} color={C.muted}>{master ? 'Apresentado por' : 'Oferecimento'}</Eyebrow>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 * k }}>
        {placeholder
          ? plate('ph', 300 * k, 100 * k, <span style={{ fontFamily: 'Public Sans', fontWeight: 600, fontSize: 22 * k, letterSpacing: 4 * k, color: C.lime }}>SUA LOGO AQUI</span>, true)
          : withLogo.map((s, i) => {
            const big = i === 0 && master
            const w = (big ? 260 : s.weight >= 2 ? 190 : 150) * k
            const h = (big ? 100 : s.weight >= 2 ? 84 : 70) * k
            return plate(s.id, w, h, <img src={`${API_ORIGIN}${s.logo_url}`} style={{ maxWidth: w - 20 * k, maxHeight: h - 20 * k, objectFit: 'contain' }} />)
          })}
      </div>
    </div>
  )
}

// ------------------------------------------------------------------ campeão
export async function championImage(card: ChampionCard, size: Size, opts: { placeholder?: boolean } = {}) {
  const tall = size.height > size.width
  const { art, mark, fonts } = await assets(tall ? 'champion-portrait' : 'champion-landscape')
  const sets = card.sets ?? []
  const day = fmtDay(card.played_on)
  const ctx = `${card.season} · ${card.category}`
  const name = Math.min(tall ? 168 : 104, Math.floor((tall ? 1450 : 900) / Math.max(card.champion.length, 6)))
  const final = card.runner_up ? `na final contra ${card.runner_up}${card.result_type === 'retired' ? ' (abandono)' : ''}` : null

  if (tall) {
    return new ImageResponse((
      <Canvas size={size} art={art} artH={1620}>
        <div style={{ display: 'flex', flexDirection: 'column', width: '100%', padding: '64px 72px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Wordmark mark={mark} />
            <Pill>{`Final${day ? ` · ${day}` : ''}`}</Pill>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', marginTop: 70, gap: 18 }}>
            <Eyebrow size={24}>Campeão</Eyebrow>
            <div style={{ display: 'flex', fontFamily: 'Fraunces', fontWeight: 700, fontSize: name, lineHeight: 0.92,
              letterSpacing: -name * 0.025, color: C.paper }}>{card.champion}</div>
            <div style={{ display: 'flex', fontFamily: 'Public Sans', fontSize: 26, color: C.muted, marginTop: 4 }}>{ctx}</div>
          </div>
          {sets.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 34 }}>
              <SetLine sets={sets} stb={card.super_tiebreak} size={58} />
              {final && <div style={{ display: 'flex', fontSize: 24, color: C.muted }}>{final}</div>}
            </div>
          )}
          <div style={{ display: 'flex', marginTop: 40 }}>
            <Sponsors list={card.sponsors} k={1} placeholder={opts.placeholder} />
          </div>
        </div>
      </Canvas>
    ), { ...size, fonts })
  }
  return new ImageResponse((
    <Canvas size={size} art={art} artH={800}>
      <div style={{ display: 'flex', flexDirection: 'column', width: 640, padding: '46px 0 46px 56px' }}>
        <Wordmark mark={mark} k={0.8} />
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 34, gap: 10 }}>
          <Eyebrow size={18}>{`Campeão · ${card.category}`}</Eyebrow>
          <div style={{ display: 'flex', fontFamily: 'Fraunces', fontWeight: 700, fontSize: name, lineHeight: 0.95,
            letterSpacing: -name * 0.025 }}>{card.champion}</div>
        </div>
        {sets.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 20 }}>
            <SetLine sets={sets} stb={card.super_tiebreak} size={40} />
            {final && <div style={{ display: 'flex', fontSize: 19, color: C.muted }}>{final}</div>}
          </div>
        )}
        <div style={{ display: 'flex', flex: 1 }} />
        <Sponsors list={card.sponsors} k={0.72} placeholder={opts.placeholder} />
      </div>
    </Canvas>
  ), { ...size, fonts })
}

// ------------------------------------------------------------------ resultado
function Board({ card, k }: { card: MatchCardData; k: number }) {
  const sets = card.sets ?? []
  const stb = card.super_tiebreak
  const row = (side: 0 | 1) => {
    const name = side === 0 ? card.player1 : card.player2
    const win = card.winner_side === side + 1
    const vals = [...sets.map((s) => s[side]), ...(stb ? [stb[side]] : [])]
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 * k, padding: `${14 * k}px 0`,
        borderTop: side ? `2px solid ${C.faint}` : '0px solid transparent' }}>
        <div style={{ display: 'flex', width: 14 * k, height: 14 * k, borderRadius: 99, background: win ? C.lime : 'rgba(0,0,0,0)',
          border: win ? '0px solid transparent' : `2px solid ${C.faint}` }} />
        <div style={{ display: 'flex', flex: 1, fontFamily: 'Fraunces', fontWeight: win ? 700 : 500, fontSize: 64 * k,
          lineHeight: 1, color: win ? C.paper : C.muted, letterSpacing: -1 }}>{name}</div>
        {vals.map((v, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'center', width: 62 * k, fontFamily: 'Fraunces', fontWeight: 700,
            fontSize: (stb && i === vals.length - 1 ? 40 : 58) * k, color: win ? C.lime : C.muted }}>{String(v)}</div>
        ))}
      </div>
    )
  }
  return <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>{row(0)}{row(1)}</div>
}

export async function matchImage(card: MatchCardData, size: Size) {
  const tall = size.height > size.width
  const { art, mark, fonts } = await assets(tall ? 'match-portrait' : 'match-landscape')
  const tag = card.result_type === 'walkover' ? ' · W.O.' : card.result_type === 'retired' ? ' · abandono' : ''
  const day = fmtDay(card.played_on)
  if (tall) {
    return new ImageResponse((
      <Canvas size={size} art={art} artH={1620}>
        <div style={{ display: 'flex', flexDirection: 'column', width: '100%', padding: '64px 72px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Wordmark mark={mark} />
            <Pill>{`${card.stage}${tag}`}</Pill>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', marginTop: 64, gap: 10 }}>
            <Eyebrow size={24}>{`Resultado${day ? ` · ${day}` : ''}`}</Eyebrow>
            <div style={{ display: 'flex', fontFamily: 'Public Sans', fontSize: 26, color: C.muted }}>{`${card.season} · ${card.category}`}</div>
          </div>
          <div style={{ display: 'flex', marginTop: 26 }}><Board card={card} k={1} /></div>
          <div style={{ display: 'flex', marginTop: 34 }}><Sponsors list={card.sponsors} k={1} /></div>
        </div>
      </Canvas>
    ), { ...size, fonts })
  }
  return new ImageResponse((
    <Canvas size={size} art={art} artH={800}>
      <div style={{ display: 'flex', flexDirection: 'column', width: 620, padding: '46px 0 46px 56px' }}>
        <Wordmark mark={mark} k={0.8} />
        <div style={{ display: 'flex', marginTop: 30 }}>
          <Eyebrow size={17}>{`${card.stage}${tag}${day ? ` · ${day}` : ''}`}</Eyebrow>
        </div>
        <div style={{ display: 'flex', marginTop: 6, width: 470 }}><Board card={card} k={0.7} /></div>
        <div style={{ display: 'flex', flex: 1 }} />
        <Sponsors list={card.sponsors} k={0.72} />
      </div>
    </Canvas>
  ), { ...size, fonts })
}

// ------------------------------------------------------------------ patrocine
/** Prévia do link "Patrocine" no WhatsApp. */
export async function pitchImage(season: string, size: Size) {
  const { art, mark, fonts } = await assets('champion-landscape')
  return new ImageResponse((
    <Canvas size={size} art={art} artH={800}>
      <div style={{ display: 'flex', flexDirection: 'column', width: 640, padding: '46px 0 46px 56px' }}>
        <Wordmark mark={mark} k={0.8} />
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 40, gap: 12 }}>
          <Eyebrow size={18}>{`Patrocine a ${season}`}</Eyebrow>
          <div style={{ display: 'flex', fontFamily: 'Fraunces', fontWeight: 700, fontSize: 70, lineHeight: 0.98, letterSpacing: -2 }}>
            Juízo a gente perdeu.
          </div>
          <div style={{ display: 'flex', fontFamily: 'Fraunces', fontWeight: 500, fontSize: 40, lineHeight: 1.08, color: C.lime }}>
            A paixão pelo tênis ficou inteira.
          </div>
        </div>
        <div style={{ display: 'flex', flex: 1 }} />
        <div style={{ display: 'flex', width: 430, fontSize: 21, lineHeight: 1.3, color: C.muted }}>Escolha seu primata e estampe sua marca no cartão do campeão.</div>
      </div>
    </Canvas>
  ), { ...size, fonts })
}

/** Dados do cartão de exemplo da landing (com o espaço da logo do patrocinador). */
export const EXAMPLE: ChampionCard = {
  season: 'Duvis Cup', category: 'Principal', champion: 'Fulano', runner_up: 'Ciclano',
  score: '6/4 3/6 [10/8]', sets: [[6, 4], [3, 6]], super_tiebreak: [10, 8], result_type: 'normal',
  played_on: null, sponsors: [],
}
