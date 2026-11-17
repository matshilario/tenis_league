/** Grades das ferragens e do troféu em pixel art (usadas no site e nas imagens). */

export const TOOL_PAL: Record<string, string> = {
  o: '#22302a', l: '#e4e6df', m: '#a9aea6', d: '#6d746f', g: '#d3db3b', G: '#969e14',
}

export const TOOLS = {
  screw: [
    '.oooooo.',
    'ollllllo',
    'olmmmmdo',
    '.oddddo.',
    '..olmo..',
    '.olmmdo.',
    '..olmo..',
    '.olmmdo.',
    '..olmo..',
    '.olmmdo.',
    '..olmo..',
    '.olmmdo.',
    '..omdo..',
    '...oo...',
  ],
  nut: [
    '...oooo...',
    '.oollllo..',
    'ollllmmmo.',
    'olllooomdo',
    'ollo...odo',
    'olmo...odo',
    'olmmoooddo',
    '.ommmmddo.',
    '..oddddo..',
    '...oooo...',
  ],
  driver: [
    '...oo...',
    '..ogGo..',
    '.oggGGo.',
    '.oggGGo.',
    '.ogggGo.',
    '.oggGGo.',
    '.oggGGo.',
    '..oGGo..',
    '...oo...',
    '...lo...',
    '...lm...',
    '...lm...',
    '...lm...',
    '...lm...',
    '...lm...',
    '..olmo..',
    '...od...',
  ],
} as const

export type ToolName = keyof typeof TOOLS

export const TROPHY = [
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
]
export const TROPHY_PAL: Record<string, string> = { o: '#0b2a1d', y: '#d3db3b', Y: '#969e14', d: '#c48a55' }
