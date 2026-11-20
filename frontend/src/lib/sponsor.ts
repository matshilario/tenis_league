/** Utilidades do patrocínio (formatação e preparo da logo no navegador). */

export const fmtMoney = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: cents % 100 ? 2 : 0 })

const MAX_LOGO_BYTES = 1_400_000 // margem sob o limite de 1,5 MB do backend

/**
 * Converte qualquer imagem escolhida (PNG, JPG, WEBP, SVG…) em PNG de até 800 px,
 * mantendo a transparência; se ficar grande demais, reduz ou cai para JPEG.
 * A API só aceita PNG/JPEG e até 1,5 MB.
 */
export async function logoToPng(file: File, max = 800): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Escolha um arquivo de imagem.')
  if (file.size > 12_000_000) throw new Error('Arquivo muito grande.')
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((ok, fail) => {
      const i = new Image()
      i.onload = () => ok(i)
      i.onerror = () => fail(new Error('Não consegui ler essa imagem.'))
      i.src = url
    })
    const w0 = img.naturalWidth || 600
    const h0 = img.naturalHeight || 300
    const render = (side: number, jpeg = false) => {
      const k = Math.min(1, side / Math.max(w0, h0))
      const c = document.createElement('canvas')
      c.width = Math.max(1, Math.round(w0 * k))
      c.height = Math.max(1, Math.round(h0 * k))
      const ctx = c.getContext('2d')!
      if (jpeg) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height) }
      ctx.drawImage(img, 0, 0, c.width, c.height)
      return jpeg ? c.toDataURL('image/jpeg', 0.9) : c.toDataURL('image/png')
    }
    // PNG mantém transparência, mas foto/degradê vira PNG enorme: vai reduzindo
    // e, em último caso, usa JPEG em fundo branco (a API aceita até 1,5 MB).
    const fits = (d: string) => (d.length - d.indexOf(',') - 1) * 0.75 <= MAX_LOGO_BYTES
    for (const side of [max, 600, 400]) {
      const png = render(side)
      if (fits(png)) return png
    }
    const jpg = render(max, true)
    if (fits(jpg)) return jpg
    throw new Error('Não consegui deixar a logo abaixo de 1,5 MB. Tente outro arquivo.')
  } finally {
    URL.revokeObjectURL(url)
  }
}

