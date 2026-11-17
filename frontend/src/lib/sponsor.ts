/** Utilidades do patrocínio (formatação e preparo da logo no navegador). */

export const fmtMoney = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: cents % 100 ? 2 : 0 })

/**
 * Converte qualquer imagem escolhida (PNG, JPG, WEBP, SVG…) em PNG de até 800 px,
 * mantendo a transparência. A API só aceita PNG/JPEG e até 1,5 MB.
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
    const k = Math.min(1, max / Math.max(w0, h0))
    const c = document.createElement('canvas')
    c.width = Math.max(1, Math.round(w0 * k))
    c.height = Math.max(1, Math.round(h0 * k))
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
    return c.toDataURL('image/png')
  } finally {
    URL.revokeObjectURL(url)
  }
}

