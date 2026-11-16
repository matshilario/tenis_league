// Gera src/lib/icons.ts com o subconjunto de ícones Solar (Iconify) usados no app.
// Uso: node scripts/build-icons.mjs   (depois de adicionar nomes em WANT)
import { readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const set = JSON.parse(readFileSync(require.resolve('@iconify-json/solar/icons.json'), 'utf8'))

const WANT = {
  home: 'home-2-bold', cup: 'cup-star-bold', calendar: 'calendar-bold', ranking: 'ranking-bold',
  users: 'users-group-rounded-bold', rules: 'document-text-bold', admin: 'shield-user-bold',
  user: 'user-circle-bold', logout: 'logout-2-outline', eye: 'eye-outline', eyeOff: 'eye-closed-outline',
  clock: 'clock-circle-bold', check: 'check-circle-bold', warning: 'danger-triangle-bold',
  copy: 'copy-outline', link: 'link-round-angle-outline', layers: 'layers-bold', pen: 'pen-bold',
  bell: 'bell-bing-bold', tennis: 'tennis-bold', crown: 'crown-bold', flag: 'flag-bold',
  close: 'close-circle-outline', arrowRight: 'alt-arrow-right-outline', history: 'history-bold',
  chat: 'chat-round-dots-bold', sort: 'sort-vertical-outline',
}

const out = {}
for (const [key, name] of Object.entries(WANT)) {
  const icon = set.icons[name]
  if (!icon) throw new Error(`ícone ausente: ${name}`)
  out[key] = icon.body
}
const src = `// Gerado por scripts/build-icons.mjs — ícones Solar (Iconify, licença CC BY 4.0, 480 Design).
// Não edite à mão.
export const ICONS = ${JSON.stringify(out, null, 2)} as const

export type IconName = keyof typeof ICONS
`
writeFileSync(new URL('../src/lib/icons.ts', import.meta.url), src)
console.log(`icons.ts: ${Object.keys(out).length} ícones`)
