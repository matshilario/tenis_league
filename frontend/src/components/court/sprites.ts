/**
 * Sprites em pixel art da quadra — desenhados à mão como grades de caracteres.
 * Cada caractere aponta para uma cor da paleta; '.' é transparente.
 *
 * Para criar um sprite novo: escreva a grade, registre em SPRITES e use pelo nome.
 * Âncora = ponto que encosta no chão (pés), em coordenadas da grade.
 */

export type Palette = Record<string, string>

export const DAY: Palette = {
  // tenista
  h: '#5a3a22', H: '#3d2715', g: '#1e6b49',        // cabelo, sombra, faixa verde
  s: '#e3a97c', S: '#b97a52',                      // pele
  w: '#f7f1e2', W: '#d6cdb3',                      // camisa
  n: '#2e4a68', o: '#fbf8ef',                      // short, meias/tênis
  // raquete
  f: '#9a3328', x: '#f4eeda', t: '#23302a',
  // macaco-prego
  m: '#7a5230', M: '#4f331d', c: '#24170e', F: '#d8b68c', k: '#120c08',
  // bola
  b: '#d3db3b', B: '#f2f6a8',
  // cocô e fedor
  u: '#6b4423', U: '#43280f', z: '#9fbf45',
  // banco e garrafa
  d: '#8a5a32', D: '#5f3c1f', q: '#4f86b8', Q: '#2f5c86', r: '#e9ecf0',
  // coqueiro
  l: '#4b8a3a', L: '#2f5f27', p: '#b5844d', P: '#86602f',
}

/** Sessão noturna: mesma cena, sob refletores. */
export const NIGHT: Palette = {
  ...DAY,
  w: '#e6e0cf', W: '#bdb59d', o: '#e9e5d8', x: '#ddd7c4',
  l: '#3a6e2e', L: '#244a1f', p: '#93693b', P: '#6a4b24',
}

type Grid = string[]

export interface Sprite {
  grid: Grid
  ax: number // âncora x
  ay: number // âncora y
}

const s = (grid: Grid, ax: number, ay: number): Sprite => ({ grid, ax, ay })

// ---------------------------------------------------------------- tenista (costas)
const HEAD = [
  '................',
  '................',
  '......hhhh......',
  '.....hhhhhh.....',
  '.....gggggg.....',
  '.....HhhhhH.....',
  '......SssS......',
]
const TORSO = [
  '....wwwwwwww....',
  '...wwwwwwwwww...',
  '...swwwwwwwws...',
  '...swwwwwwwws...',
  '...s.wwwwww.s...',
  '...S.WWWWWW.S...',
]
const LEGS = [
  '.....nnnnnn.....',
  '.....nnnnnn.....',
  '.....nn..nn.....',
  '.....ss..ss.....',
  '.....SS..SS.....',
  '.....oo..oo.....',
  '....ooo..ooo....',
]
const LEGS_WIDE = [
  '.....nnnnnn.....',
  '....nnnnnnnn....',
  '....nn....nn....',
  '....ss....ss....',
  '....SS....SS....',
  '....oo....oo....',
  '...ooo....ooo...',
]
const LEGS_RUN_A = [
  '.....nnnnnn.....',
  '.....nnnnnn.....',
  '....nn...nn.....',
  '....ss....ss....',
  '...SS.....SS....',
  '...oo......oo...',
  '..ooo......ooo..',
]
const LEGS_RUN_B = [
  '.....nnnnnn.....',
  '.....nnnnnn.....',
  '......nnnn......',
  '......ssss......',
  '......SSSS......',
  '......oooo......',
  '.....oooooo.....',
]

const P_IDLE = [...HEAD, ...TORSO, ...LEGS]
const P_RUN_A = [...HEAD, ...TORSO, ...LEGS_RUN_A]
const P_RUN_B = [...HEAD, ...TORSO, ...LEGS_RUN_B]
// De perfil (olhando para a direita): corrida lateral. A = passada aberta, B = cruzada.
const P_SIDE_A = [
  '................',
  '................',
  '.......hhhh.....',
  '......hhhhss....',
  '......gggggg....',
  '......hhhsks....',
  '......hhssss....',
  '.......SssS.....',
  '......wwwww.....',
  '.....wwwwwwss...',
  '....swwwwww..S..',
  '...s.wwwwww.....',
  '......WWWWW.....',
  '......nnnnn.....',
  '.....nnn.nnn....',
  '....nn....nn....',
  '....ss.....ss...',
  '...SS.......ss..',
  '..oo.........oo.',
  '.ooo.........ooo',
]
const P_SIDE_B = [
  '................',
  '.......hhhh.....',
  '......hhhhss....',
  '......gggggg....',
  '......hhhsks....',
  '......hhssss....',
  '.......SssS.....',
  '......wwwww.....',
  '......wwwwws....',
  '......wwwwwS....',
  '......wwwwww....',
  '......WWWWW.....',
  '......nnnnn.....',
  '......nnnnn.....',
  '.......nnn......',
  '.......ss.s.....',
  '.......ss..s....',
  '.......SS..S....',
  '.......oo.oo....',
  '......ooo.ooo...',
]
const P_SWING = [
  ...HEAD,
  '....wwwwwwww....',
  '...wwwwwwwwwwsss',
  '...swwwwwwwww.SS',
  '...swwwwwwwww...',
  '...s.wwwwww.....',
  '...S.WWWWWW.....',
  ...LEGS_WIDE,
]
const P_REACH = [
  '............SS..',
  '............ss..',
  '......hhhh..ss..',
  '.....hhhhhh.ss..',
  '.....gggggg.w...',
  '.....HhhhhHw....',
  '......SssSw.....',
  '....wwwwwwww....',
  '...wwwwwwwww....',
  '...swwwwwwww....',
  '...swwwwwwww....',
  '...s.wwwwww.....',
  '...S.WWWWWW.....',
  ...LEGS,
]
const P_SHRUG = [
  '................',
  '..S..........S..',
  '..s...hhhh...s..',
  '..s..hhhhhh..s..',
  '..ss.gggggg.ss..',
  '...s.HhhhhH.s...',
  '...ww.SssS.ww...',
  '....wwwwwwww....',
  '....wwwwwwww....',
  '....wwwwwwww....',
  '....wwwwwwww....',
  '.....wwwwww.....',
  '.....WWWWWW.....',
  ...LEGS,
]

// ---------------------------------------------------------------------- raquete
/** Raquete em pé (cabeça para cima). Âncora = ponta do cabo. */
const RACKET_UP: Sprite = s([
  '.fff.',
  'fxfxf',
  'ffxff',
  'fxfxf',
  'ffxff',
  '.fff.',
  '..f..',
  '..t..',
  '..t..',
], 2, 8)

function rotateCW(sp: Sprite): Sprite {
  const h = sp.grid.length
  const w = sp.grid[0].length
  const grid: string[] = []
  for (let x = 0; x < w; x++) {
    let row = ''
    for (let y = h - 1; y >= 0; y--) row += sp.grid[y][x]
    grid.push(row)
  }
  return { grid, ax: h - 1 - sp.ay, ay: sp.ax }
}

const RACKET_RIGHT = rotateCW(RACKET_UP)                 // cabeça para a direita
const RACKET_DOWN = rotateCW(RACKET_RIGHT)               // cabeça para baixo
const RACKET_LEFT = rotateCW(RACKET_DOWN)                // cabeça para a esquerda

// ----------------------------------------------------------------- macaco-prego
// De perfil, olhando para a direita. Boné escuro (topete) e cara clara.
const M_RUN_A = [
  '............cc..',
  '...........cccc.',
  '..MM.......cFFc.',
  '.M..M......FkFF.',
  '.M...mmmmmmmFF..',
  '..M.mmmmmmmmm...',
  '....mmmmmmmm....',
  '....mm.....mm...',
  '...m.m.....m.m..',
]
const M_RUN_B = [
  '................',
  '............cc..',
  '..MM.......cccc.',
  '.M..M......cFFc.',
  '.M...mmmmmmFkFF.',
  '..M.mmmmmmmmFF..',
  '....mmmmmmmmm...',
  '.....mm...mm....',
  '.....m.m..m.m...',
]
const M_SIT = [
  '........cc......',
  '.......cccc.....',
  '.......cFFc.....',
  '.......FkFF.....',
  '........FF......',
  '.MM....mmmm.....',
  'M..M..mmmmmm....',
  'M...M.mmmmmmm...',
  '.M...mmmmmmm....',
  '..MMmmm..mmm....',
]
const M_SIT_LOOK = [
  '........cc......',
  '.......cccc.....',
  '.......cFFc.....',
  '.......FFkF.....',
  '........FF......',
  '.MM....mmmm.....',
  'M..M..mmmmmm....',
  'M...M.mmmmmmm...',
  '.M...mmmmmmm....',
  '..MMmmm..mmm....',
]

// Agachado (fazendo cocô) e com o braço erguido (arremesso).
const M_SQUAT = [
  '................',
  '................',
  '..........cc....',
  '.........cccc...',
  '.........cFFc...',
  '.MM......FkFF...',
  'M..M..mmmmFF....',
  'M...Mmmmmmmmm...',
  '.M.mmmmmmmmm....',
  '..MMmm.mm.mm....',
]
const M_THROW = [
  '........cc...mm.',
  '.......cccc.mm..',
  '.......cFFc.m...',
  '.......FkFFmm...',
  '........FFmm....',
  '.MM....mmmm.....',
  'M..M..mmmmmm....',
  'M...M.mmmmmmm...',
  '.M...mmmmmmm....',
  '..MMmmm..mmm....',
]

// ------------------------------------------------------------------ objetos
const BALL = s(['.bb.', 'bBbb', 'bbbb', '.bb.'], 2, 3)
const BALL_SMALL = s(['b'], 0, 0)
const POOP = s(['.u.', 'uUu', 'UuU'], 1, 2)
const SPLAT = s(['u..u.u', '.uUuu.', 'uu.U.u'], 3, 1)
const STINK_A = s(['z.z', '.z.', 'z..'], 1, 2)
const STINK_B = s(['.z.', 'z.z', '..z'], 1, 2)
const BENCH = s([
  'dddddddddddddd',
  'DDDDDDDDDDDDDD',
  '.D..........D.',
  '.D..........D.',
], 7, 3)
const BOTTLE = s(['.r', 'qq', 'qQ', 'qQ', 'qQ'], 1, 4)
const PALM = s([
  '...l...l......',
  '.llLl.lLll....',
  'lL..lllL..ll..',
  'l..lLLlllL..l.',
  '..lL.pplL.l...',
  '.l...pP..L....',
  '.....pP.......',
  '......pP......',
  '......pP......',
  '.....pP.......',
  '.....pP.......',
  '......pP......',
  '......pP......',
  '.....ppPP.....',
], 6, 13)

export const SPRITES = {
  idle: s(P_IDLE, 8, 19),
  runA: s(P_RUN_A, 8, 19),
  runB: s(P_RUN_B, 8, 19),
  sideA: s(P_SIDE_A, 8, 19),
  sideB: s(P_SIDE_B, 8, 19),
  swing: s(P_SWING, 8, 19),
  reach: s(P_REACH, 8, 19),
  shrug: s(P_SHRUG, 8, 19),
  racketUp: RACKET_UP,
  racketRight: RACKET_RIGHT,
  racketDown: RACKET_DOWN,
  racketLeft: RACKET_LEFT,
  monkeyRunA: s(M_RUN_A, 8, 8),
  monkeyRunB: s(M_RUN_B, 8, 8),
  monkeySit: s(M_SIT, 8, 9),
  monkeySitLook: s(M_SIT_LOOK, 8, 9),
  monkeySquat: s(M_SQUAT, 8, 9),
  monkeyThrow: s(M_THROW, 8, 9),
  poop: POOP,
  splat: SPLAT,
  stinkA: STINK_A,
  stinkB: STINK_B,
  ball: BALL,
  ballSmall: BALL_SMALL,
  bench: BENCH,
  bottle: BOTTLE,
  palm: PALM,
} satisfies Record<string, Sprite>

export type SpriteName = keyof typeof SPRITES

/**
 * Poses do tenista = corpo + raquete. (rx, ry) é onde o cabo encosta, relativo à
 * âncora dos pés. Pose espelhada (backhand) usa flip no desenho.
 */
export interface Pose {
  body: SpriteName
  racket: SpriteName
  rx: number
  ry: number
  dy?: number // quique vertical
}

export const POSES = {
  idle: { body: 'idle', racket: 'racketDown', rx: 4, ry: -7 },
  idleBob: { body: 'idle', racket: 'racketDown', rx: 4, ry: -6, dy: 1 },
  runA: { body: 'runA', racket: 'racketRight', rx: 4, ry: -8 },
  runB: { body: 'runB', racket: 'racketRight', rx: 4, ry: -8, dy: -1 },
  // corrida lateral de perfil: raquete levada à frente, na mão da frente
  sideA: { body: 'sideA', racket: 'racketRight', rx: 5, ry: -9 },
  sideB: { body: 'sideB', racket: 'racketRight', rx: 3, ry: -10 },
  prep: { body: 'idle', racket: 'racketRight', rx: 5, ry: -9 },
  hit: { body: 'swing', racket: 'racketUp', rx: 7, ry: -10 },
  follow: { body: 'idle', racket: 'racketLeft', rx: -5, ry: -13 },
  toss: { body: 'reach', racket: 'racketRight', rx: 4, ry: -8 },
  serve: { body: 'reach', racket: 'racketUp', rx: 4, ry: -19 },
  shrug: { body: 'shrug', racket: 'racketUp', rx: 5, ry: -18 },
  cheer: { body: 'reach', racket: 'racketUp', rx: 4, ry: -19, dy: -1 },
} satisfies Record<string, Pose>

export type PoseName = keyof typeof POSES

/** Pré-renderiza um sprite num canvas (1 px por célula). */
export function renderSprite(sp: Sprite, pal: Palette): HTMLCanvasElement {
  const h = sp.grid.length
  const w = Math.max(...sp.grid.map((r) => r.length))
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')!
  for (let y = 0; y < h; y++) {
    const row = sp.grid[y]
    for (let x = 0; x < row.length; x++) {
      const ch = row[x]
      if (ch === '.' || ch === ' ') continue
      const col = pal[ch]
      if (!col) continue
      ctx.fillStyle = col
      ctx.fillRect(x, y, 1, 1)
    }
  }
  return c
}
