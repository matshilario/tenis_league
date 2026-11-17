/* eslint-disable @next/next/no-img-element, jsx-a11y/alt-text */
/**
 * Cartões de compartilhamento (campeão, resultado e "patrocine"), renderizados com
 * next/og (satori). A cena é a mesma quadra em pixel art do site, desenhada com divs
 * (o satori não tem canvas). Regra do satori: bloco com mais de um filho = display flex.
 */
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ImageResponse } from 'next/og'
import { DAY, POSES, SPRITES, type SpriteName } from '@/components/court/sprites'
import { ART, type ArtName } from '@/lib/pixelArt'
import type { ChampionCard, MatchCardData, PublicSponsor } from '@/lib/types'
import { API_ORIGIN } from './fetch'

const C = {
  deep: '#114530', deeper: '#0c3524', paper: '#f6efdf', cream: '#fcf8ee', lime: '#d3db3b',
  ink: '#10372a', clay: '#c48a55', clayDark: '#b27a47', clayLight: '#cf9864',
  court: '#1e6b49', courtDark: '#1a5f41', line: '#f6efdf', netDark: '#10372a', netLight: '#4d7d66',
  red: '#b2342a', navy: '#2e4a68', muted: 'rgba(246,239,223,0.72)',
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

// ------------------------------------------------------------------ pixel art
type Cell = { x: number; y: number; w?: number; h?: number; c: string }

/** Grade -> células (em pixels de arte). */
function cells(grid: readonly string[], pal: Record<string, string>, x0: number, y0: number, flip = false): Cell[] {
  const w = Math.max(...grid.map((r) => r.length))
  const out: Cell[] = []
  grid.forEach((row, y) => [...row].forEach((ch, x) => {
    const c = pal[ch]
    if (c) out.push({ x: x0 + (flip ? w - 1 - x : x), y: y0 + y, c })
  }))
  return out
}

/** Sprite da quadra posicionado pela âncora (pés), como CourtEngine.blit. */
function sprite(name: SpriteName, x: number, y: number, flip = false): Cell[] {
  const sp = SPRITES[name]
  const w = Math.max(...sp.grid.map((r) => r.length))
  const left = flip ? x - (w - 1 - sp.ax) : x - sp.ax
  return cells(sp.grid, DAY, left, y - sp.ay, flip)
}

function art(name: ArtName, x: number, y: number, flip = false): Cell[] {
  const a = ART[name]
  return cells(a.grid, a.pal as Record<string, string>, x, y, flip)
}

function Pixels({ list, u, w, h }: { list: Cell[]; u: number; w: number; h: number }) {
  return (
    <div style={{ display: 'flex', position: 'relative', width: w * u, height: h * u }}>
      {list.map((p, i) => (
        <div key={i} style={{ position: 'absolute', left: p.x * u, top: p.y * u, width: (p.w ?? 1) * u,
          height: (p.h ?? 1) * u, background: p.c }} />
      ))}
    </div>
  )
}

const BALL = ['.bb.', 'bBbb', 'bbbb', '.bb.']
const MINI_TROPHY = {
  grid: ['.yyyyyy.', 'yyyyyyYy', 'y.yyyY.y', '.yyyyY..', '..yyY...', '...yY...', '..yyYY..', '..dddd..'],
  pal: { y: '#d3db3b', Y: '#969e14', d: '#5f3c1f' },
}

/** Pseudoaleatório determinístico (a mesma cena sempre). */
function rng(seed: number) {
  let s = seed
  return () => ((s = (s * 16807) % 2147483647) / 2147483647)
}

/**
 * Quadra vista de trás da linha de base, como a faixa do site: rede no alto, saibro dos
 * lados, coqueiros. W×(OV+54) pixels de arte; OV = área livre acima da rede.
 */
function court(W: number, kind: 'champion' | 'match'): { list: Cell[]; H: number } {
  const OV = kind === 'champion' ? 22 : 12
  const TOP = OV + 9, BASE = OV + 46, PY = OV + 50, H = OV + 54
  const cx = Math.round(W / 2)
  const hwTop = Math.round(W * 0.27), hwBot = Math.round(W * 0.37)
  const hwAt = (y: number) => hwTop + ((hwBot - hwTop) * (y - TOP)) / (BASE - TOP)
  const L: Cell[] = []
  const r = rng(7)
  L.push({ x: 0, y: OV, w: W, h: 54, c: C.clay })
  for (let i = 0; i < (W * 54) / 9; i++) {
    L.push({ x: Math.floor(r() * W), y: OV + Math.floor(r() * 54), c: r() < 0.6 ? C.clayDark : C.clayLight })
  }
  for (let y = TOP; y <= BASE + 1; y++) {
    const hw = Math.round(hwAt(y))
    L.push({ x: cx - hw, y, w: hw * 2 + 1, c: (y >> 2) % 2 ? C.court : C.courtDark })
  }
  const serviceY = Math.round(TOP + (BASE - TOP) * 0.42)
  for (let y = TOP; y <= BASE; y++) {
    const hw = Math.round(hwAt(y)), sw = Math.round(hwAt(y) * 0.78)
    for (const x of [cx - hw, cx + hw, cx - sw, cx + sw]) L.push({ x, y, c: C.line })
    if (y <= serviceY) L.push({ x: cx, y, c: C.line })
  }
  const sw = Math.round(hwAt(serviceY) * 0.78)
  L.push({ x: cx - sw, y: serviceY, w: sw * 2 + 1, c: C.line })
  const hb = Math.round(hwAt(BASE))
  L.push({ x: cx - hb, y: BASE, w: hb * 2 + 1, h: 2, c: C.line })
  // coqueiros
  L.push(...sprite('palm', cx - hwBot - 9, OV + 30), ...sprite('palm', cx + hwBot + 9, OV + 26))
  // rede: sombra, malha, fita e postes
  const nl = cx - hwTop - 6, nr = cx + hwTop + 6
  L.push({ x: nl, y: OV + 8, w: nr - nl + 1, h: 2, c: 'rgba(16,30,20,0.28)' })
  for (let y = 2; y <= 7; y++) for (let x = nl; x <= nr; x++) {
    L.push({ x, y: OV + y, c: x % 3 === 0 || y % 2 === 0 ? C.netLight : C.netDark })
  }
  L.push({ x: nl, y: OV, w: nr - nl + 1, h: 2, c: C.line })
  L.push({ x: nl - 2, y: OV, w: 2, h: 11, c: '#23302a' }, { x: nr + 1, y: OV, w: 2, h: 11, c: '#23302a' })

  if (kind === 'champion') {
    // macaco-prego sentado perto do poste, de olho no troféu (e com a bola)
    L.push(...sprite('monkeySitLook', nl - 7, OV + 17))
    L.push(...cells(BALL, DAY, nl - 2, OV + 12))
    // campeão erguendo o troféu
    const px = cx + 2
    L.push({ x: px - 5, y: PY - 1, w: 11, h: 2, c: 'rgba(16,30,20,0.28)' })
    L.push(...sprite('reach', px, PY))
    L.push(...cells(MINI_TROPHY.grid, MINI_TROPHY.pal, px + 1, PY - 27)) // na mão erguida
    // confete por cima de tudo
    const cf = [C.lime, C.paper, C.red, C.lime, C.clayLight, '#4f86b8']
    const r2 = rng(42)
    for (let i = 0; i < 46; i++) {
      const x = Math.floor(r2() * W), y = Math.floor(r2() * (OV + 30))
      L.push({ x, y, w: r2() < 0.5 ? 1 : 2, h: 1, c: cf[i % cf.length] })
    }
  } else {
    // forehand + bola; o macaco passa correndo com outra bola
    const px = cx - 6
    const P = POSES.hit
    L.push({ x: px - 5, y: PY - 1, w: 11, h: 2, c: 'rgba(16,30,20,0.28)' })
    L.push(...sprite(P.body as SpriteName, px, PY), ...sprite(P.racket as SpriteName, px + P.rx, PY + P.ry))
    L.push(...cells(BALL, DAY, px + 12, PY - 24))
    L.push(...sprite('monkeyRunA', cx + hwBot - 2, OV + 40, true))
    L.push(...cells(BALL, DAY, cx + hwBot - 12, OV + 33))
  }
  return { list: L, H }
}

function Scene({ kind, u, W }: { kind: 'champion' | 'match'; u: number; W: number }) {
  const { list, H } = court(W, kind)
  return (
    <div style={{ display: 'flex', borderRadius: 18, overflow: 'hidden', border: `4px solid ${C.deeper}`,
      background: C.deeper, boxShadow: '0 30px 60px -30px rgba(0,0,0,0.6)' }}>
      <Pixels list={list} u={u} w={W} h={H} />
    </div>
  )
}

// ------------------------------------------------------------------ blocos
function Header({ markSrc, label, right, k }: { markSrc: string; label: string; right?: string; k: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18 * k }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 * k }}>
        <img src={markSrc} width={60 * k} height={60 * k} />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontFamily: 'Fraunces', fontWeight: 700, fontSize: 32 * k, color: C.paper, letterSpacing: 2 }}>
            <span style={{ color: C.lime }}>DU</span>VIS CUP
          </div>
          <div style={{ fontFamily: 'Silkscreen', fontSize: 17 * k, color: C.muted, textTransform: 'uppercase' }}>{label}</div>
        </div>
      </div>
      {right && (
        <div style={{ display: 'flex', fontFamily: 'Silkscreen', fontSize: 17 * k, color: C.ink, background: C.lime,
          padding: `${6 * k}px ${12 * k}px`, borderRadius: 6 * k, textTransform: 'uppercase' }}>{right}</div>
      )}
    </div>
  )
}

type Row = { name: string; sets: number[]; stb?: number | null; win: boolean }

/** Placar estilo TV: nome + games de cada set (e o super tie-break). */
function Scoreboard({ rows, k, nameSize }: { rows: Row[]; k: number; nameSize: number }) {
  const cols = Math.max(...rows.map((r) => r.sets.length + (r.stb != null ? 1 : 0)), 0)
  const box = 64 * k
  return (
    <div style={{ display: 'flex', flexDirection: 'column', borderRadius: 14 * k, overflow: 'hidden',
      border: `3px solid ${C.deeper}` }}>
      {rows.map((r, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', background: r.win ? C.cream : '#e8e0c8',
          borderTop: i ? `3px solid ${C.deeper}` : '0px solid transparent' }}>
          <div style={{ display: 'flex', width: 14 * k, height: box * 1.05, background: r.win ? C.lime : 'rgba(0,0,0,0)' }} />
          <div style={{ display: 'flex', flex: 1, padding: `0 ${18 * k}px`, fontFamily: 'Fraunces',
            fontWeight: r.win ? 700 : 500, fontSize: nameSize, color: r.win ? C.ink : 'rgba(16,55,42,0.62)' }}>{r.name}</div>
          {Array.from({ length: cols }).map((_, j) => {
            const stb = j >= r.sets.length
            const v = stb ? r.stb : r.sets[j]
            return (
              <div key={j} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: box, height: box * 1.05,
                fontFamily: 'Silkscreen', fontSize: (stb ? 26 : 34) * k, color: r.win ? C.ink : 'rgba(16,55,42,0.62)',
                background: stb ? 'rgba(16,55,42,0.08)' : 'rgba(0,0,0,0)', borderLeft: `3px solid ${C.deeper}` }}>
                {v == null ? '' : String(v)}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

/** Faixa creme dos patrocinadores (ou o espaço "sua logo aqui" no cartão de exemplo). */
function SponsorBand({ list, k, placeholder }: { list: PublicSponsor[]; k: number; placeholder?: boolean }) {
  const withLogo = list.filter((s) => s.logo_url).slice(0, 5)
  const master = withLogo[0]?.weight >= 3 ? withLogo[0] : null
  const rest = master ? withLogo.slice(1) : withLogo
  const tile = (key: string, w: number, h: number, child: React.ReactNode, dashed = false) => (
    <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: w, height: h,
      padding: 8 * k, borderRadius: 10 * k, background: dashed ? 'rgba(211,219,59,0.25)' : '#ffffff',
      border: dashed ? `3px dashed ${C.ink}` : '1px solid rgba(16,55,42,0.12)' }}>{child}</div>
  )
  const logo = (s: PublicSponsor, w: number, h: number) => tile(s.id, w, h,
    <img src={`${API_ORIGIN}${s.logo_url}`} style={{ maxWidth: w - 16 * k, maxHeight: h - 16 * k, objectFit: 'contain' }} />)
  let body: React.ReactNode
  if (placeholder) {
    body = tile('ph', 320 * k, 96 * k, <span style={{ fontFamily: 'Silkscreen', fontSize: 22 * k, color: C.ink }}>SUA LOGO AQUI</span>, true)
  } else if (!withLogo.length) {
    body = <span style={{ fontFamily: 'Public Sans', fontSize: 22 * k, color: C.ink }}>duviscup.com.br · liga amadora de tênis</span>
  } else {
    body = (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 * k, flexWrap: 'wrap' }}>
        {master && logo(master, 260 * k, 96 * k)}
        {rest.map((s) => logo(s, (s.weight >= 2 ? 180 : 140) * k, (s.weight >= 2 ? 80 : 64) * k))}
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 18 * k, background: C.cream, borderRadius: 16 * k,
      padding: `${16 * k}px ${20 * k}px` }}>
      <div style={{ display: 'flex', fontFamily: 'Silkscreen', fontSize: 15 * k, color: C.ink, textTransform: 'uppercase' }}>
        {master ? 'Apresentado por' : 'Oferecimento'}
      </div>
      {body}
    </div>
  )
}

function Card({ size, children }: { size: Size; children: React.ReactNode }) {
  return (
    <div style={{ width: size.width, height: size.height, display: 'flex', position: 'relative',
      backgroundImage: `linear-gradient(180deg, ${C.deep} 0%, ${C.deeper} 100%)`, color: C.paper, fontFamily: 'Public Sans' }}>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 12, display: 'flex', background: C.clay }} />
      {children}
    </div>
  )
}

const fmtDay = (d: string | null | undefined) => (d ? d.split('-').reverse().slice(0, 2).join('/') : null)

// ------------------------------------------------------------------ cartões
export async function championImage(card: ChampionCard, size: Size, opts: { placeholder?: boolean } = {}) {
  const { markSrc, fonts } = await assets()
  const tall = size.height > size.width
  const k = tall ? 1 : 0.85
  const rows: Row[] = [
    { name: card.champion, sets: (card.sets ?? []).map((s) => s[0]), stb: card.super_tiebreak?.[0], win: true },
    ...(card.runner_up ? [{ name: card.runner_up, sets: (card.sets ?? []).map((s) => s[1]), stb: card.super_tiebreak?.[1], win: false }] : []),
  ]
  const name = Math.min(tall ? 170 : 104, Math.floor((tall ? 1750 : 1000) / Math.max(card.champion.length, 6)))
  const day = fmtDay(card.played_on)
  const right = `Final${day ? ` · ${day}` : ''}${card.result_type === 'retired' ? ' · abandono' : ''}`
  const label = `${card.season} · ${card.category}`
  const badge = (
    <div style={{ display: 'flex', alignSelf: 'flex-start', background: C.lime, color: C.ink, fontFamily: 'Silkscreen',
      fontSize: 24 * k, padding: `${7 * k}px ${14 * k}px`, borderRadius: 8 * k }}>CAMPEÃO</div>
  )
  const title = <div style={{ fontFamily: 'Fraunces', fontWeight: 700, fontSize: name, lineHeight: 0.95, letterSpacing: -2 }}>{card.champion}</div>

  if (tall) {
    return new ImageResponse((
      <Card size={size}>
        <div style={{ display: 'flex', flexDirection: 'column', width: '100%', padding: '52px 56px 64px', gap: 30 }}>
          <Header markSrc={markSrc} label={label} right={right} k={1} />
          <Scene kind="champion" u={6} W={161} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>{badge}{title}</div>
          {rows[0].sets.length > 0 && <Scoreboard rows={rows} k={1} nameSize={34} />}
          <div style={{ display: 'flex', flex: 1 }} />
          <SponsorBand list={card.sponsors} k={1} placeholder={opts.placeholder} />
        </div>
      </Card>
    ), { ...size, fonts })
  }
  return new ImageResponse((
    <Card size={size}>
      <div style={{ display: 'flex', width: '100%', padding: '40px 44px 48px', gap: 36 }}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 18 }}>
          <Header markSrc={markSrc} label={label} k={0.85} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 6 }}>{badge}{title}</div>
          {rows[0].sets.length > 0 && <Scoreboard rows={rows} k={0.72} nameSize={26} />}
          <div style={{ display: 'flex', flex: 1 }} />
          <SponsorBand list={card.sponsors} k={0.72} placeholder={opts.placeholder} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Scene kind="champion" u={4} W={121} />
        </div>
      </div>
    </Card>
  ), { ...size, fonts })
}

export async function matchImage(card: MatchCardData, size: Size) {
  const { markSrc, fonts } = await assets()
  const tall = size.height > size.width
  const rows: Row[] = [
    { name: card.player1, sets: (card.sets ?? []).map((s) => s[0]), stb: card.super_tiebreak?.[0], win: card.winner_side === 1 },
    { name: card.player2, sets: (card.sets ?? []).map((s) => s[1]), stb: card.super_tiebreak?.[1], win: card.winner_side === 2 },
  ]
  const tag = card.result_type === 'walkover' ? ' · W.O.' : card.result_type === 'retired' ? ' · abandono' : ''
  const right = `${card.stage}${tag}`
  const label = `${card.season} · ${card.category}`
  const when = fmtDay(card.played_on)
  if (tall) {
    return new ImageResponse((
      <Card size={size}>
        <div style={{ display: 'flex', flexDirection: 'column', width: '100%', padding: '52px 56px 64px', gap: 30 }}>
          <Header markSrc={markSrc} label={label} right={right} k={1} />
          <Scene kind="match" u={6} W={161} />
          <div style={{ display: 'flex', fontFamily: 'Silkscreen', fontSize: 24, color: C.lime }}>
            {`RESULTADO${when ? ` · ${when}` : ''}`}
          </div>
          <Scoreboard rows={rows} k={1.25} nameSize={52} />
          <div style={{ display: 'flex', flex: 1 }} />
          <SponsorBand list={card.sponsors} k={1} />
        </div>
      </Card>
    ), { ...size, fonts })
  }
  return new ImageResponse((
    <Card size={size}>
      <div style={{ display: 'flex', width: '100%', padding: '40px 44px 48px', gap: 36 }}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 18 }}>
          <Header markSrc={markSrc} label={label} k={0.85} />
          <div style={{ display: 'flex', fontFamily: 'Silkscreen', fontSize: 20, color: C.lime, marginTop: 8 }}>
            {`${right.toUpperCase()}${when ? ` · ${when}` : ''}`}
          </div>
          <Scoreboard rows={rows} k={0.9} nameSize={38} />
          <div style={{ display: 'flex', flex: 1 }} />
          <SponsorBand list={card.sponsors} k={0.72} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Scene kind="match" u={4} W={121} />
        </div>
      </div>
    </Card>
  ), { ...size, fonts })
}

/** Cartão "Patrocine" para a prévia do link no WhatsApp: os três primatas das cotas. */
export async function pitchImage(season: string, size: Size) {
  const { markSrc, fonts } = await assets()
  const trio: Cell[] = [...art('sagui', 0, 9), ...art('prego', 18, 10), ...art('gorila', 38, 4)]
  return new ImageResponse((
    <Card size={size}>
      <div style={{ display: 'flex', width: '100%', padding: '44px 48px 52px', gap: 30 }}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
          <Header markSrc={markSrc} label={`Patrocine a ${season}`} k={0.85} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontFamily: 'Fraunces', fontWeight: 700, fontSize: 70, lineHeight: 0.98, letterSpacing: -2 }}>
              Juízo a gente perdeu.
            </div>
            <div style={{ fontFamily: 'Fraunces', fontWeight: 500, fontSize: 44, lineHeight: 1.05, color: C.lime }}>
              A paixão pelo tênis ficou inteira.
            </div>
          </div>
          <div style={{ display: 'flex', fontFamily: 'Silkscreen', fontSize: 20, color: C.muted }}>
            Escolha seu primata · sua marca no cartão do campeão
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18 }}>
          <Pixels list={trio} u={8} w={54} h={19} />
          <div style={{ display: 'flex', gap: 46, fontFamily: 'Silkscreen', fontSize: 18, color: C.lime }}>
            <span>SAGUI</span><span>PREGO</span><span>GORILA</span>
          </div>
        </div>
      </div>
    </Card>
  ), { ...size, fonts })
}

/** Dados do cartão de exemplo da landing (com o espaço da logo do patrocinador). */
export const EXAMPLE: ChampionCard = {
  season: 'Duvis Cup', category: 'Principal', champion: 'Seu Campeão', runner_up: 'O Vice',
  score: '6/4 3/6 [10/8]', sets: [[6, 4], [3, 6]], super_tiebreak: [10, 8], result_type: 'normal',
  played_on: null, sponsors: [],
}
