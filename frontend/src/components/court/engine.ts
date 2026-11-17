/**
 * Motor da quadra em pixel art.
 *
 * A borda de cima da faixa É a rede: o conteúdo da página é a quadra do adversário e
 * a gente vê o nosso lado, de costas para a tela. Tudo é desenhado num buffer de baixa
 * resolução (1 unidade = 1 pixel de arte) e ampliado sem suavização.
 *
 * Coordenadas do mundo: x da esquerda; y = chão, 0 na fita da rede, crescendo para
 * baixo; z = altura da bola. No canvas, a faixa começa em OV (área livre acima por
 * onde a bola passa por cima da rede e "invade" a página).
 */

import { DAY, NIGHT, POSES, SPRITES, renderSprite, type Palette, type PoseName, type SpriteName } from './sprites'

export const STRIP_H = 54 // altura da faixa em pixels de arte
export const OVERFLOW = 30 // área transparente acima da faixa

const COURT_TOP = 9
const BASE_Y = 46
const PLAYER_Y = 50

export interface Vec { x: number; y: number; z: number }

export interface Geo {
  W: number
  cx: number
  hwTop: number
  hwBot: number
  serviceY: number
  playerY: number
  baseY: number
  courtTop: number
  postL: number
  postR: number
  bench: { x: number; y: number } | null
  palms: { x: number; y: number }[]
}

export const hwAt = (g: Geo, y: number) =>
  g.hwTop + ((g.hwBot - g.hwTop) * (y - g.courtTop)) / (g.baseY - g.courtTop)
export const singlesAt = (g: Geo, y: number) => hwAt(g, y) * 0.78

export const rand = (a: number, b: number) => a + Math.random() * (b - a)
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t

// ------------------------------------------------------------------- entidades
interface Leg { to: Vec; dur: number; arc: number; vanish?: boolean }

export class Ball {
  pos: Vec = { x: 0, y: 0, z: 0 }
  visible = false
  carriedBy: 'monkey' | null = null
  private legs: Leg[] = []
  private from: Vec = { x: 0, y: 0, z: 0 }
  private t = 0

  start(at: Vec, legs: Leg[]) {
    this.pos = { ...at }
    this.visible = true
    this.carriedBy = null
    this.setLegs(legs)
  }
  setLegs(legs: Leg[]) {
    this.legs = legs
    this.from = { ...this.pos }
    this.t = 0
  }
  get moving() { return this.legs.length > 0 }
  hide() { this.visible = false; this.legs = []; this.carriedBy = null }

  update(dt: number) {
    if (!this.legs.length || this.carriedBy) return
    const leg = this.legs[0]
    this.t += dt
    const k = Math.min(1, this.t / leg.dur)
    this.pos = {
      x: lerp(this.from.x, leg.to.x, k),
      y: lerp(this.from.y, leg.to.y, k),
      z: lerp(this.from.z, leg.to.z, k) + leg.arc * 4 * k * (1 - k),
    }
    if (k >= 1) {
      this.legs.shift()
      this.from = { ...leg.to }
      this.t = 0
      if (leg.vanish) this.hide()
    }
  }
}

type Step = [PoseName, number]

export class Player {
  x = 0
  /** até quando aparece a mancha de cocô na cabeça (tempo do motor) */
  splatUntil = 0
  y = PLAYER_Y
  flip = false
  private target: number | null = null
  private speed = 60
  private seq: Step[] = []
  private seqFlip = false
  private seqT = 0
  private animT = 0

  moveTo(x: number, speed = 60) { this.target = x; this.speed = speed }
  stop() { this.target = null }
  get moving() { return this.target !== null }
  get busy() { return this.seq.length > 0 }
  /** Sequência de poses; flip espelha (backhand / lado esquerdo). */
  play(steps: Step[], flip = false) { this.seq = steps; this.seqFlip = flip; this.seqT = 0 }

  update(dt: number) {
    this.animT += dt
    if (this.target !== null) {
      const d = this.target - this.x
      const step = this.speed * dt
      if (Math.abs(d) <= step) { this.x = this.target; this.target = null }
      else { this.x += Math.sign(d) * step; this.flip = d < 0 }
    }
    if (this.seq.length) {
      this.seqT += dt
      if (this.seqT >= this.seq[0][1]) { this.seq.shift(); this.seqT = 0 }
    }
  }

  pose(): { pose: PoseName; flip: boolean } {
    if (this.seq.length) return { pose: this.seq[0][0], flip: this.seqFlip }
    // correndo de lado: perfil (espelhado quando vai para a esquerda)
    if (this.target !== null) return { pose: Math.floor(this.animT / 0.11) % 2 ? 'sideA' : 'sideB', flip: this.flip }
    return { pose: Math.floor(this.animT / 0.7) % 2 ? 'idleBob' : 'idle', flip: false }
  }
}

export class Monkey {
  x = -20
  y = 10
  visible = false
  flip = false
  state: 'run' | 'sit' = 'run'
  carrying: 'ball' | 'bottle' | 'poop' | null = null
  /** pose fixa durante uma cena (agachado, arremesso…) */
  forced: SpriteName | null = null
  lookAt: number | null = null
  private target: number | null = null
  private targetY: number | null = null
  private speed = 80
  private animT = 0

  enter(x: number, y: number) { this.x = x; this.y = y; this.visible = true; this.state = 'run'; this.carrying = null }
  moveTo(x: number, y: number | null = null, speed = 80) {
    this.target = x; this.targetY = y; this.speed = speed; this.state = 'run'
  }
  get arrived() { return this.target === null }
  leave() { this.visible = false; this.carrying = null; this.target = null; this.lookAt = null; this.forced = null }

  update(dt: number) {
    this.animT += dt
    if (this.target === null) return
    const dx = this.target - this.x
    const dy = (this.targetY ?? this.y) - this.y
    const dist = Math.hypot(dx, dy)
    const step = this.speed * dt
    if (dist <= step) {
      this.x = this.target
      if (this.targetY !== null) this.y = this.targetY
      this.target = null
    } else {
      this.x += (dx / dist) * step
      this.y += (dy / dist) * step
      if (Math.abs(dx) > 0.5) this.flip = dx < 0
    }
  }

  sprite(): SpriteName {
    if (this.forced) return this.forced
    if (this.state === 'sit') {
      return Math.floor(this.animT / 1.3) % 3 === 2 ? 'monkeySitLook' : 'monkeySit'
    }
    return Math.floor(this.animT / 0.09) % 2 ? 'monkeyRunA' : 'monkeyRunB'
  }
}

/**
 * Personagem da turma que aparece ao lado da quadra (fora do jogo). Anda de perfil;
 * nas cenas, `forced` fixa uma pose (caído, deitado…).
 */
export type BuddyKind = 'org' | 'andre'

const BUDDY_FRAMES: Record<BuddyKind, { stand: SpriteName; walk: [SpriteName, SpriteName] }> = {
  org: { stand: 'buddyWalkB', walk: ['buddyWalkA', 'buddyWalkB'] },
  andre: { stand: 'andreStand', walk: ['andreWalkA', 'andreWalkB'] },
}

export class Buddy {
  kind: BuddyKind = 'org'
  x = -20
  y = 49
  visible = false
  flip = false
  forced: SpriteName | null = null
  /** mancando: passo curto e passo arrastado */
  limp = false
  private target: number | null = null
  private speed = 30
  private animT = 0

  enter(x: number, y: number, kind: BuddyKind = 'org') {
    this.kind = kind
    this.x = x; this.y = y; this.visible = true; this.forced = null; this.limp = false
  }
  moveTo(x: number, speed = 30) { this.target = x; this.speed = speed }
  get arrived() { return this.target === null }
  leave() { this.visible = false; this.target = null; this.forced = null; this.limp = false }

  update(dt: number) {
    this.animT += dt
    if (this.target === null) return
    const d = this.target - this.x
    // mancando: anda só no passo "bom"
    const slow = this.limp && this.animT % 0.5 > 0.3 ? 0.25 : 1
    const step = this.speed * slow * dt
    if (Math.abs(d) <= step) { this.x = this.target; this.target = null }
    else { this.x += Math.sign(d) * step; this.flip = d < 0 }
  }

  sprite(): SpriteName {
    if (this.forced) return this.forced
    const fr = BUDDY_FRAMES[this.kind]
    if (this.target === null) return fr.stand
    if (this.limp) return this.animT % 0.5 > 0.3 ? 'buddyGrab' : 'buddyWalkB'
    return fr.walk[Math.floor(this.animT / 0.16) % 2]
  }

  /** Topo da cabeça (coordenadas do mundo), para o balão de fala. */
  head(): { x: number; y: number } {
    const f = this.flip ? -1 : 1
    const s = this.sprite()
    // deitado: balão acima da perna levantada, para não cobri-la
    if (s.startsWith('buddyLie')) return { x: this.x - f * 8, y: this.y - 15 }
    if (s === 'buddySit') return { x: this.x - f * 1, y: this.y - 13 }
    return { x: this.x + f, y: this.y - 18 }
  }

  /** Ponto do sprite (coluna/linha da grade, âncora 8,19) em coordenadas do mundo. */
  at(col: number, row: number): { x: number; y: number } {
    const f = this.flip ? -1 : 1
    return { x: this.x + f * (col - 8), y: this.y + row - 19 }
  }
}

// ---------------------------------------------------------------- roteirização
export type Wait = number | (() => boolean)
export type Script = Generator<Wait, void, unknown>

class Track {
  private script: Script | null = null
  private wait = 0
  private cond: (() => boolean) | null = null
  get idle() { return this.script === null }
  run(s: Script) { this.script = s; this.wait = 0; this.cond = null }
  step(dt: number) {
    if (!this.script) return
    if (this.wait > 0) { this.wait -= dt; if (this.wait > 0) return }
    if (this.cond && !this.cond()) return
    this.cond = null
    const r = this.script.next()
    if (r.done) { this.script = null; return }
    if (typeof r.value === 'number') this.wait = r.value
    else this.cond = r.value
  }
}

export interface SceneDef {
  id: string
  /** main: tenista e bola · ambient: macaco de fundo · side: turma ao lado da quadra */
  track: 'main' | 'ambient' | 'side'
  weight: number
  /** Cenas com macaco compartilham um intervalo mínimo entre aparições. */
  monkey?: boolean
  when?: (e: CourtEngine) => boolean
  run: (e: CourtEngine) => Script
}

// ------------------------------------------------------------------------ motor
interface Colors {
  clay: string; clayDark: string; clayLight: string
  court: string; courtDark: string; line: string
  netDark: string; netLight: string; tape: string; post: string; shadow: string
}

const DAY_COLORS: Colors = {
  clay: '#c48a55', clayDark: '#b27a47', clayLight: '#cf9864',
  court: '#1e6b49', courtDark: '#1a5f41', line: '#f6efdf',
  netDark: '#10372a', netLight: '#4d7d66', tape: '#fbf8ef', post: '#23302a',
  shadow: 'rgba(16,30,20,0.28)',
}
const NIGHT_COLORS: Colors = {
  clay: '#6e4f33', clayDark: '#5f432a', clayLight: '#7a593b',
  court: '#164b35', courtDark: '#13422e', line: '#d8d1bc',
  netDark: '#081c14', netLight: '#2f5444', tape: '#e2dccb', post: '#0e1612',
  shadow: 'rgba(0,0,0,0.38)',
}

export const MONKEY_COOLDOWN = 25 // segundos entre aparições do macaco
/** Intervalo (s) entre as cenas da turma ao lado da quadra. */
export const SIDE_GAP: [number, number] = [45, 80]
/** A primeira aparição do macaco na página é sempre esta cena (a favorita da turma). */
export const FIRST_MONKEY_SCENE = 'monkey-poop'

export class CourtEngine {
  geo!: Geo
  ball = new Ball()
  /** cocô arremessado (mesma física da bola) */
  poop = new Ball()
  player = new Player()
  monkey = new Monkey()
  buddy = new Buddy()
  /** balão de fala ativo (tenista ou personagem da turma) */
  speech: { text: string; from: number; until: number; who: 'player' | 'buddy' } | null = null
  sideBusy = false
  /** partículas de fumaça (x, y já na tela de arte, sem a área de overflow) */
  private puffs: { x: number; y: number; vx: number; vy: number; age: number; life: number; big: boolean }[] = []
  bottleOnBench = true
  bottleBackAt = 0
  lastMonkeyAt = -1e9
  time = 0
  monkeyBusy = false
  /** já houve alguma aparição do macaco nesta página? */
  monkeySeen = false

  private ctx: CanvasRenderingContext2D
  private buf: HTMLCanvasElement
  private bctx: CanvasRenderingContext2D
  private bg: HTMLCanvasElement
  private sprites = new Map<string, HTMLCanvasElement>()
  private pal: Palette = DAY
  private colors: Colors = DAY_COLORS
  private main = new Track()
  private ambient = new Track()
  private side = new Track()
  private nextSideAt = rand(30, 40)
  private sideGap = SIDE_GAP
  private scale = 2
  private dpr = 1
  private font = 'monospace'
  private firstMonkeyAt = rand(8, 12)
  private cooldown = MONKEY_COOLDOWN

  constructor(private canvas: HTMLCanvasElement, private scenes: SceneDef[]) {
    scenes = [...scenes]
    this.ctx = canvas.getContext('2d')!
    this.buf = document.createElement('canvas')
    this.bctx = this.buf.getContext('2d')!
    this.bg = document.createElement('canvas')
    // fonte pixel do app (Silkscreen, via next/font) para os balões de fala
    const fam = getComputedStyle(document.documentElement).getPropertyValue('--font-pixel').trim()
    if (fam) {
      this.font = fam
      document.fonts?.load(`16px ${fam}`).catch(() => {})
    }
    // ?macaco na URL: o macaco aparece logo e com frequência (teste / curiosidade)
    const q = new URLSearchParams(window.location.search)
    if (q.has('macaco')) {
      this.firstMonkeyAt = 1
      this.cooldown = 6
      // ?macaco=<id da cena> força só aquela cena do macaco (ex.: ?macaco=monkey-ball)
      const only = q.get('macaco')
      if (only) this.firstMonkeyAt = -1 // cena forçada já no primeiro sorteio
      if (only) this.scenes = scenes.filter((sc) => sc.id === only).map((sc) => ({ ...sc, weight: 1000 }))
        .concat(scenes.filter((sc) => sc.track === 'main' && !sc.monkey))
    }
    // ?turma (ou ?turma=<id da cena>): personagens da turma aparecem logo e repetem
    if (q.has('turma')) {
      this.nextSideAt = 2
      this.sideGap = [6, 8]
      const only = q.get('turma')
      if (only) this.scenes = this.scenes.filter((sc) => sc.track !== 'side' || sc.id === only)
    }
  }

  setNight(night: boolean) {
    this.pal = night ? NIGHT : DAY
    this.colors = night ? NIGHT_COLORS : DAY_COLORS
    this.sprites.clear()
    if (this.geo) this.drawBackground()
  }

  /** Recalcula a geometria para a largura em CSS px e a escala de pixel. */
  resize(cssWidth: number, scale: number) {
    this.scale = scale
    const W = Math.max(120, Math.ceil(cssWidth / scale))
    const H = OVERFLOW + STRIP_H
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.dpr = dpr
    this.canvas.width = Math.round(W * scale * dpr)
    this.canvas.height = Math.round(H * scale * dpr)
    this.buf.width = W
    this.buf.height = H
    this.bg.width = W
    this.bg.height = H
    const cx = Math.round(W / 2)
    const hwTop = Math.round(Math.min(W * 0.34, 150))
    const hwBot = Math.round(Math.min(W * 0.45, 196))
    const side = W / 2 - hwBot
    const palms: { x: number; y: number }[] = []
    if (side > 26) { palms.push({ x: Math.round(cx - hwBot - side * 0.55), y: 30 }); palms.push({ x: Math.round(cx + hwBot + side * 0.5), y: 26 }) }
    if (side > 80) { palms.push({ x: Math.round(cx - hwBot - side * 0.85), y: 20 }); palms.push({ x: Math.round(cx + hwBot + side * 0.82), y: 34 }) }
    const prevW = this.geo?.W
    this.geo = {
      W, cx, hwTop, hwBot,
      serviceY: Math.round(COURT_TOP + (BASE_Y - COURT_TOP) * 0.42),
      playerY: PLAYER_Y, baseY: BASE_Y, courtTop: COURT_TOP,
      postL: cx - hwTop - 7, postR: cx + hwTop + 7,
      bench: side > 30 ? { x: Math.round(cx - hwBot - Math.min(side * 0.5, 30)), y: 44 } : null,
      palms,
    }
    if (prevW === undefined || Math.abs(prevW - W) > 4) {
      this.player.x = cx
      this.player.stop()
    }
    this.drawBackground()
  }

  private spr(name: SpriteName): HTMLCanvasElement {
    let c = this.sprites.get(name)
    if (!c) { c = renderSprite(SPRITES[name], this.pal); this.sprites.set(name, c) }
    return c
  }

  private blit(ctx: CanvasRenderingContext2D, name: SpriteName, x: number, y: number, flip = false) {
    const sp = SPRITES[name]
    const img = this.spr(name)
    const px = Math.round(x)
    const py = Math.round(y)
    if (!flip) {
      ctx.drawImage(img, px - sp.ax, py - sp.ay)
    } else {
      ctx.save()
      ctx.translate(px + 1, 0)
      ctx.scale(-1, 1)
      ctx.drawImage(img, -sp.ax, py - sp.ay)
      ctx.restore()
    }
  }

  // ------------------------------------------------------------- cenário fixo
  private drawBackground() {
    const g = this.geo
    const c = this.bg.getContext('2d')!
    const C = this.colors
    const O = OVERFLOW
    c.clearRect(0, 0, g.W, O + STRIP_H)

    // terra batida com textura determinística
    c.fillStyle = C.clay
    c.fillRect(0, O, g.W, STRIP_H)
    let seed = 7
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    for (let i = 0; i < (g.W * STRIP_H) / 9; i++) {
      c.fillStyle = rnd() < 0.6 ? C.clayDark : C.clayLight
      c.fillRect(Math.floor(rnd() * g.W), O + Math.floor(rnd() * STRIP_H), 1, 1)
    }

    // piso da quadra (área de duplas) + leve faixa alternada
    for (let y = g.courtTop; y <= g.baseY + 1; y++) {
      const hw = Math.round(hwAt(g, y))
      c.fillStyle = (y >> 2) % 2 ? C.court : C.courtDark
      c.fillRect(g.cx - hw, O + y, hw * 2 + 1, 1)
    }

    // linhas
    c.fillStyle = C.line
    for (let y = g.courtTop; y <= g.baseY; y++) {
      const hw = Math.round(hwAt(g, y))
      const sw = Math.round(singlesAt(g, y))
      for (const x of [g.cx - hw, g.cx + hw, g.cx - sw, g.cx + sw]) c.fillRect(x, O + y, 1, 1)
      if (y <= g.serviceY) c.fillRect(g.cx, O + y, 1, 1) // linha central de saque
    }
    const sw = Math.round(singlesAt(g, g.serviceY))
    c.fillRect(g.cx - sw, O + g.serviceY, sw * 2 + 1, 1)
    const hb = Math.round(hwAt(g, g.baseY))
    c.fillRect(g.cx - hb, O + g.baseY, hb * 2 + 1, 2) // linha de fundo
    c.fillRect(g.cx, O + g.baseY - 2, 1, 2) // marca central

    // coqueiros e banco
    for (const p of g.palms) this.blit(c, 'palm', p.x, O + p.y)
    if (g.bench) this.blit(c, 'bench', g.bench.x, O + g.bench.y)

    // rede: fita + malha + postes + sombra
    const nl = g.cx - g.hwTop - 6
    const nr = g.cx + g.hwTop + 6
    c.fillStyle = C.shadow
    c.fillRect(nl, O + 8, nr - nl + 1, 2)
    for (let y = 2; y <= 7; y++) {
      for (let x = nl; x <= nr; x++) {
        c.fillStyle = x % 3 === 0 || y % 2 === 0 ? C.netLight : C.netDark
        c.fillRect(x, O + y, 1, 1)
      }
    }
    c.fillStyle = C.tape
    c.fillRect(nl, O, nr - nl + 1, 2)
    c.fillStyle = C.post
    c.fillRect(nl - 2, O, 2, 11)
    c.fillRect(nr + 1, O, 2, 11)
  }

  // --------------------------------------------------------------- simulação
  update(dt: number) {
    dt = Math.min(dt, 0.1)
    this.time += dt
    this.ball.update(dt)
    this.player.update(dt)
    this.monkey.update(dt)
    this.buddy.update(dt)
    for (const p of this.puffs) { p.age += dt; p.x += p.vx * dt; p.y += p.vy * dt }
    this.puffs = this.puffs.filter((p) => p.age < p.life)
    this.poop.update(dt)
    if (this.monkey.carrying === 'poop') {
      const throwing = this.monkey.forced === 'monkeyThrow'
      const dir = (this.monkey.lookAt !== null ? this.monkey.lookAt < this.monkey.x : this.monkey.flip) ? -1 : 1
      this.poop.pos = { x: this.monkey.x + dir * (throwing ? 5 : 4), y: this.monkey.y, z: throwing ? 10 : 4 }
    }
    if (!this.bottleOnBench && this.bottleBackAt && this.time > this.bottleBackAt) {
      this.bottleOnBench = true
      this.bottleBackAt = 0
    }
    if (this.ball.carriedBy === 'monkey') {
      this.ball.pos = { x: this.monkey.x + (this.monkey.flip ? -5 : 5), y: this.monkey.y, z: 5 }
    }
    if (this.main.idle) this.main.run(this.pick('main'))
    if (this.ambient.idle) {
      const s = this.pickAmbient()
      if (s) this.ambient.run(s)
    }
    if (this.side.idle && !this.sideBusy && !this.monkeyBusy && this.time > this.nextSideAt) {
      const pool = this.scenes.filter((s) => s.track === 'side' && (!s.when || s.when(this)))
      if (pool.length) this.side.run(this.wrapSide(pool[Math.floor(Math.random() * pool.length)]))
      else this.nextSideAt = Infinity
    }
    this.main.step(dt)
    this.ambient.step(dt)
    this.side.step(dt)
  }

  /** Fumaça: baforada (big) ou fiapo do cigarro. */
  puff(x: number, y: number, big: boolean) {
    const away = this.buddy.flip ? -1 : 1
    this.puffs.push({
      x, y, big, age: 0,
      vx: big ? away * rand(5, 9) : rand(-1.5, 1.5),
      vy: big ? -rand(3, 6) : -rand(5, 8),
      life: big ? rand(1.4, 2) : rand(1.6, 2.4),
    })
  }

  private *wrapSide(s: SceneDef): Script {
    this.sideBusy = true
    try {
      yield* s.run(this)
    } finally {
      this.sideBusy = false
      this.buddy.leave()
      this.puffs = []
      this.nextSideAt = this.time + rand(this.sideGap[0], this.sideGap[1])
    }
  }

  monkeyReady() {
    const since = this.time - this.lastMonkeyAt
    return !this.monkeyBusy && this.time > this.firstMonkeyAt && since > this.cooldown
  }

  private pick(track: 'main' | 'ambient'): Script {
    if (track === 'main' && !this.monkeySeen && this.monkeyReady()) {
      const first = this.scenes.find((s) => s.id === FIRST_MONKEY_SCENE && (!s.when || s.when(this)))
      if (first) return this.wrap(first)
    }
    const pool = this.scenes.filter((s) => s.track === track &&
      (!s.monkey || this.monkeyReady()) && (!s.when || s.when(this)))
    const total = pool.reduce((a, s) => a + s.weight, 0)
    let r = Math.random() * total
    for (const s of pool) {
      r -= s.weight
      if (r <= 0) return this.wrap(s)
    }
    return this.wrap(pool[0])
  }

  private pickAmbient(): Script | null {
    // as cenas de fundo nunca são a primeira aparição e ficam raras (~1 a cada 40 s
    // depois de liberado), para não tirarem a vez das cenas principais do macaco
    if (!this.monkeySeen || !this.monkeyReady() || Math.random() > 0.0004) return null
    const pool = this.scenes.filter((s) => s.track === 'ambient' && (!s.when || s.when(this)))
    if (!pool.length) return null
    return this.wrap(pool[Math.floor(Math.random() * pool.length)])
  }

  private *wrap(s: SceneDef): Script {
    if (s.monkey || s.track === 'ambient') {
      this.monkeyBusy = true
      this.monkeySeen = true
      this.lastMonkeyAt = this.time
    }
    try {
      yield* s.run(this)
    } finally {
      if (s.monkey || s.track === 'ambient') { this.monkeyBusy = false; this.lastMonkeyAt = this.time }
    }
  }

  // ----------------------------------------------------------------- desenho
  draw() {
    const g = this.geo
    const b = this.bctx
    const O = OVERFLOW
    b.clearRect(0, 0, g.W, O + STRIP_H)
    b.drawImage(this.bg, 0, 0)

    if (g.bench && this.bottleOnBench) this.blit(b, 'bottle', g.bench.x + 4, O + g.bench.y - 2)

    type Item = { y: number; draw: () => void }
    const items: Item[] = []

    // tenista
    const { pose, flip } = this.player.pose()
    const P = POSES[pose] as { body: SpriteName; racket: SpriteName; rx: number; ry: number; dy?: number }
    items.push({
      y: this.player.y,
      draw: () => {
        const px = this.player.x
        const py = O + this.player.y + (P.dy ?? 0)
        b.fillStyle = this.colors.shadow
        b.fillRect(Math.round(px) - 5, O + this.player.y - 1, 11, 2)
        const rx = flip ? -P.rx : P.rx
        // raquete atrás do corpo quando está do lado oposto ao braço
        const behind = P.racket === 'racketLeft' || P.racket === 'racketDown'
        if (behind) this.blit(b, P.racket, px + rx, py + P.ry, flip)
        this.blit(b, P.body, px, py, flip)
        if (!behind) this.blit(b, P.racket, px + rx, py + P.ry, flip)
        if (this.time < this.player.splatUntil) this.blit(b, 'splat', px, py - 17)
      },
    })

    // macaco
    if (this.monkey.visible) {
      const m = this.monkey
      items.push({
        y: m.y,
        draw: () => {
          b.fillStyle = this.colors.shadow
          b.fillRect(Math.round(m.x) - 4, O + Math.round(m.y), 9, 1)
          const flipM = m.lookAt !== null ? m.lookAt < m.x : m.flip
          this.blit(b, m.sprite(), m.x, O + m.y, flipM)
          if (m.carrying === 'bottle') this.blit(b, 'bottle', m.x + (flipM ? -4 : 4), O + m.y - 2)
        },
      })
    }

    // personagem da turma
    if (this.buddy.visible) {
      const bd = this.buddy
      items.push({
        y: bd.y,
        draw: () => {
          const name = bd.sprite()
          const wide = name.startsWith('buddyLie') || name === 'buddySit'
          b.fillStyle = this.colors.shadow
          b.fillRect(Math.round(bd.x) - (wide ? 12 : 5), O + Math.round(bd.y), wide ? 24 : 11, 1)
          this.blit(b, name, bd.x, O + bd.y, bd.flip)
        },
      })
    }

    items.sort((a, c) => a.y - c.y)
    for (const it of items) it.draw()

    // fumaça por cima dos personagens
    for (const p of this.puffs) {
      const k = p.age / p.life
      const size = p.big ? (k < 0.3 ? 2 : 3) : k < 0.5 ? 1 : 2
      b.globalAlpha = 0.85 * (1 - k)
      b.fillStyle = this.pal === NIGHT ? '#bdb8ad' : '#ece8de'
      b.fillRect(Math.round(p.x - size / 2), O + Math.round(p.y - size / 2), size, size)
    }
    b.globalAlpha = 1

    // bola por último: passa por cima da rede e do resto
    if (this.ball.visible) {
      const { x, y, z } = this.ball.pos
      const onOurSide = y >= g.courtTop - 1
      if (onOurSide && !this.ball.carriedBy) {
        b.fillStyle = this.colors.shadow
        b.fillRect(Math.round(x) - 1, O + Math.round(y), 3, 1)
      }
      const far = y < 2
      this.blit(b, far ? 'ballSmall' : 'ball', x, O + y - z)
    }
    if (this.poop.visible) {
      const { x, y, z } = this.poop.pos
      if (this.monkey.carrying !== 'poop') {
        b.fillStyle = this.colors.shadow
        b.fillRect(Math.round(x) - 1, O + Math.round(y), 3, 1)
      } else {
        this.blit(b, Math.floor(this.time / 0.25) % 2 ? 'stinkA' : 'stinkB', x, O + y - z - 4)
      }
      this.blit(b, 'poop', x, O + y - z)
    }

    // amplia para o canvas visível
    const ctx = this.ctx
    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    ctx.drawImage(this.buf, 0, 0, this.canvas.width, this.canvas.height)
    this.drawSpeech(ctx)
  }

  /** Alguém fala por alguns segundos (balão acima da cabeça). */
  say(text: string, secs = 1.8, who: 'player' | 'buddy' = 'player') {
    this.speech = { text, from: this.time, until: this.time + secs, who }
  }

  /** Balão de fala em pixel art, desenhado já na resolução da tela (texto nítido). */
  private drawSpeech(ctx: CanvasRenderingContext2D) {
    const sp = this.speech
    if (!sp) return
    if (this.time > sp.until) { this.speech = null; return }
    const u = this.scale * this.dpr // 1 pixel de arte em pixels do canvas
    const t = this.time - sp.from
    const pop = t < 0.06 ? 0.6 : t < 0.12 ? 0.85 : 1 // entrada em degraus, bem "8-bit"
    const size = Math.round(5.5 * u * pop)
    ctx.save()
    ctx.font = `700 ${size}px ${this.font}`
    ctx.textBaseline = 'middle'
    const tw = Math.ceil(ctx.measureText(sp.text).width)
    const padX = Math.round(3 * u * pop)
    const padY = Math.round(2.5 * u * pop)
    const w = tw + padX * 2
    const h = size + padY * 2
    const head = sp.who === 'buddy' ? this.buddy.head() : { x: this.player.x, y: this.player.y - 21 }
    const headX = head.x * u
    const headY = (OVERFLOW + head.y) * u
    // tremidinha nos primeiros instantes: grito!
    const shake = t < 0.5 ? Math.round(Math.sin(t * 60) * u * 0.6) : 0
    let x = Math.round(headX - w / 2) + shake
    x = Math.max(u * 2, Math.min(this.canvas.width - w - u * 2, x))
    const y = Math.max(u, Math.round(headY - h - 2 * u))
    const border = '#10372a'
    const fill = '#fbf8ef'
    const px = Math.max(1, Math.round(u)) // espessura da borda = 1 pixel de arte
    // corpo com cantos "comidos" (cara de pixel art)
    ctx.fillStyle = border
    ctx.fillRect(x + px, y, w - 2 * px, h)
    ctx.fillRect(x, y + px, w, h - 2 * px)
    ctx.fillStyle = fill
    ctx.fillRect(x + px, y + px, w - 2 * px, h - 2 * px)
    // cauda em degraus apontando para a cabeça
    const tx = Math.max(x + 3 * px, Math.min(x + w - 6 * px, Math.round(headX - px)))
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = border
      ctx.fillRect(tx - px + i * px, y + h - px + i * px, (3 - i) * px + px, px * 2)
      ctx.fillStyle = fill
      if (i < 2) ctx.fillRect(tx + i * px, y + h - px + i * px, (2 - i) * px, px)
    }
    ctx.fillStyle = '#9a3328'
    ctx.fillText(sp.text, x + padX, y + h / 2 + px * 0.5)
    ctx.restore()
  }

  /** Quadro estático (movimento reduzido): sem animação, cena completa. */
  drawStatic() {
    const g = this.geo
    this.player.x = g.cx + 6
    this.ball.start({ x: g.cx - 18, y: g.serviceY + 6, z: 0 }, [])
    if (g.W > 200) {
      this.monkey.enter(g.postL - 6, 17)
      this.monkey.state = 'sit'
      this.monkey.lookAt = g.cx
    }
    this.draw()
  }
}
