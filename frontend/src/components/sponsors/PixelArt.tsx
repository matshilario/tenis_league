'use client'

import { useEffect, useRef } from 'react'
import { ART, type ArtName } from '@/lib/pixelArt'
import { cn } from '@/lib/utils'

/** Desenha uma pixel art (canvas em 1:1 ampliado sem suavização). */
export function PixelArt({ name, scale = 4, flip, className, title }: {
  name: ArtName; scale?: number; flip?: boolean; className?: string; title?: string
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  const { grid, pal } = ART[name]
  const w = Math.max(...grid.map((r) => r.length))
  const h = grid.length
  useEffect(() => {
    const ctx = ref.current?.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, w, h)
    grid.forEach((row, y) => [...row].forEach((ch, x) => {
      const c = (pal as Record<string, string>)[ch]
      if (!c) return
      ctx.fillStyle = c
      ctx.fillRect(flip ? w - 1 - x : x, y, 1, 1)
    }))
  }, [grid, pal, w, h, flip])
  return (
    <canvas ref={ref} width={w} height={h} role={title ? 'img' : undefined} aria-label={title}
      aria-hidden={title ? undefined : true}
      className={cn('pixelated', className)} style={{ width: w * scale, height: h * scale }} />
  )
}
