'use client'

import { useEffect, useRef, useState } from 'react'
import { Icon } from '@/components/Icon'
import { cn } from '@/lib/utils'
import { CourtEngine, OVERFLOW, STRIP_H } from './engine'
import { SCENES } from './scenes'

const KEY = 'duvis.court'

const readPref = () => {
  try { return window.localStorage.getItem(KEY) !== 'off' } catch { return true }
}
const writePref = (on: boolean) => {
  try { window.localStorage.setItem(KEY, on ? 'on' : 'off') } catch { /* sem storage */ }
}

/**
 * Faixa fixa no rodapé: a borda de cima é a rede, a página é a quadra do adversário.
 * Fica acima de `--nav-h` (barra de abas no celular, definida pelo shell).
 */
export function CourtStrip() {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [on, setOn] = useState(true)
  const [scale, setScale] = useState(2)

  useEffect(() => { setOn(readPref()) }, [])

  // altura reservada no fim da página (para nada ficar escondido atrás da quadra)
  useEffect(() => {
    const h = on ? STRIP_H * scale : 0
    document.documentElement.style.setProperty('--court-h', `${h}px`)
    return () => { document.documentElement.style.setProperty('--court-h', '0px') }
  }, [on, scale])

  useEffect(() => {
    if (!on) return
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return

    const engine = new CourtEngine(canvas, SCENES)
    const darkMq = window.matchMedia('(prefers-color-scheme: dark)')
    const motionMq = window.matchMedia('(prefers-reduced-motion: reduce)')
    engine.setNight(darkMq.matches)

    let raf = 0
    let last = 0
    let running = false

    const layout = () => {
      const w = wrap.clientWidth
      const sc = w < 640 ? 2 : 3
      setScale(sc)
      canvas.style.width = `${w}px`
      canvas.style.height = `${(STRIP_H + OVERFLOW) * sc}px`
      engine.resize(w, sc)
      if (motionMq.matches) engine.drawStatic()
      else engine.draw()
    }

    const frame = (t: number) => {
      const dt = last ? (t - last) / 1000 : 0
      last = t
      engine.update(dt)
      engine.draw()
      raf = requestAnimationFrame(frame)
    }
    const start = () => {
      if (running || motionMq.matches || document.hidden) return
      running = true
      last = 0
      raf = requestAnimationFrame(frame)
    }
    const stop = () => { running = false; cancelAnimationFrame(raf) }

    const onVisibility = () => (document.hidden ? stop() : start())
    const onMotion = () => { if (motionMq.matches) { stop(); engine.drawStatic() } else start() }
    const onDark = () => { engine.setNight(darkMq.matches); engine.draw() }

    const ro = new ResizeObserver(layout)
    ro.observe(wrap)
    layout()
    start()
    document.addEventListener('visibilitychange', onVisibility)
    motionMq.addEventListener('change', onMotion)
    darkMq.addEventListener('change', onDark)

    return () => {
      stop()
      ro.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      motionMq.removeEventListener('change', onMotion)
      darkMq.removeEventListener('change', onDark)
    }
  }, [on])

  const toggle = () => { const v = !on; setOn(v); writePref(v) }

  return (
    <>
      <div ref={wrapRef} aria-hidden="true"
        className={cn('pointer-events-none fixed inset-x-0 z-30 print:hidden', !on && 'hidden')}
        style={{ height: STRIP_H * scale, bottom: 'var(--nav-h, 0px)' }}>
        <canvas ref={canvasRef} className="pixelated absolute bottom-0 left-0 block" />
      </div>
      <button type="button" onClick={toggle} aria-pressed={on}
        title={on ? 'Esconder quadra' : 'Mostrar quadra'}
        className="fixed right-2 z-40 flex items-center gap-1 rounded-full border border-black/10 bg-[rgb(246_239_223/0.88)] px-2 py-1 font-pixel text-[10px] uppercase tracking-wider text-[rgb(16_55_42/0.75)] shadow-card backdrop-blur hover:text-[rgb(16_55_42)] print:hidden"
        style={{ bottom: 'calc(var(--nav-h, 0px) + 6px)' }}>
        <Icon name={on ? 'eyeOff' : 'eye'} className="h-3.5 w-3.5" />
        <span className={on ? 'sr-only sm:not-sr-only' : ''}>{on ? 'Esconder quadra' : 'Mostrar quadra'}</span>
      </button>
    </>
  )
}
