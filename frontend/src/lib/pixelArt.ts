/**
 * Pixel art do patrocínio (site e imagens de compartilhamento): os primatas das cotas,
 * troféu e bola. O macaco-prego é o mesmo da quadra. '.' é transparente.
 */
import { DAY, SPRITES } from '@/components/court/sprites'

export type Art = { grid: readonly string[]; pal: Record<string, string> }

const SAGUI_PAL = { x: '#f4f1e8', q: '#8d877b', Q: '#5a554c', F: '#d8b68c', k: '#120c08' }
const GORILA_PAL = { R: '#2b2724', T: '#45403b', f: '#6e6258', E: '#9a9086', k: '#120c08' }

export const ART = {
  sagui: {
    pal: SAGUI_PAL,
    grid: [
      '...QQQQ.......',
      'xxQQQQQQxx....',
      'xxQFFFFQxx....',
      '..QkFFkQ......',
      '...FFFF.......',
      '...qqqq.......',
      '..qqQqqq......',
      '..qqqQqq...QQ.',
      '..qQqqqq..q..Q',
      '...qq.qq.Q...q',
      '...QQ.QQqQqQ..',
    ],
  },
  prego: { pal: DAY, grid: SPRITES.monkeySit.grid },
  pregoBall: {
    pal: DAY,
    grid: [
      '........cc......',
      '.......cccc.....',
      '.......cFFc.bb..',
      '.......FkFFbBbb.',
      '........FF.bbbb.',
      '.MM....mmmmmbb..',
      'M..M..mmmmmm....',
      'M...M.mmmmmmm...',
      '.M...mmmmmmm....',
      '..MMmmm..mmm....',
    ],
  },
  gorila: {
    pal: GORILA_PAL,
    grid: [
      '.....RRRRRR.....',
      '....RRRRRRRR....',
      '....RffffffR....',
      '....fkffffkf....',
      '....ffTTTTff....',
      '...RRfTkkTfRR...',
      '.RRRRRffffRRRRR.',
      'RRTRRRRRRRRRRTRR',
      'RRTRRREEEERRRTRR',
      'RRTRRREEEERRRTRR',
      'RR.RRRREERRRR.RR',
      'ff.RRRRRRRRRR.ff',
      '...RRRR..RRRR...',
      '...RRR....RRR...',
      '..TTTT....TTTT..',
    ],
  },
  ball: { pal: DAY, grid: ['.bb.', 'bBbb', 'bbbb', '.bb.'] },
  trophy: {
    pal: { o: '#0b2a1d', y: '#d3db3b', Y: '#969e14', d: '#c48a55' },
    grid: [
      '..oooooooooooo..',
      '..oyyyyyyyyYYo..',
      'oooyyyyyyyyYYooo',
      'oyooyyyyyyyYYoYo',
      'oyooyyyyyyyYYoYo',
      '.oyoyyyyyyyYYoo.',
      '..ooyyyyyyyYYo..',
      '...oyyyyyyYYo...',
      '....ooyyyYoo....',
      '......oyYo......',
      '......oyYo......',
      '.....oyyYYo.....',
      '....oooooooo....',
      '....oddddddo....',
      '....oddddddo....',
      '....oooooooo....',
    ],
  },
} satisfies Record<string, Art>

export type ArtName = keyof typeof ART

/** Primata de cada cota pelo peso: 1 sagui, 2 macaco-prego, 3 gorila. */
export const tierPrimate = (weight: number): ArtName =>
  weight >= 3 ? 'gorila' : weight === 2 ? 'prego' : 'sagui'
