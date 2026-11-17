'use client'

import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

/**
 * Ferragens em pixel art (mesma linguagem da quadra): parafuso, porca e chave de fenda.
 * Grades desenhadas à mão; '.' é transparente.
 */
import { TOOL_PAL as PAL, TOOLS, type ToolName } from '@/lib/pixelTools'

export { TOOLS }
export type { ToolName }


export function PixelTool({ name, scale = 4, className, title }: {
  name: ToolName; scale?: number; className?: string; title?: string
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  const grid = TOOLS[name]
  const w = Math.max(...grid.map((r) => r.length))
  const h = grid.length
  useEffect(() => {
    const ctx = ref.current?.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, w, h)
    grid.forEach((row, y) => [...row].forEach((ch, x) => {
      const c = PAL[ch]
      if (!c) return
      ctx.fillStyle = c
      ctx.fillRect(x, y, 1, 1)
    }))
  }, [grid, w, h])
  return (
    <canvas ref={ref} width={w} height={h} role={title ? 'img' : undefined} aria-label={title}
      aria-hidden={title ? undefined : true}
      className={cn('pixelated', className)} style={{ width: w * scale, height: h * scale }} />
  )
}
