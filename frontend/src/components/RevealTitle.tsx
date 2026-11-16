'use client'

import { gsap } from 'gsap'
import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

/**
 * Título com entrada palavra por palavra (GSAP). O nome acessível é o texto inteiro;
 * as palavras animadas são decorativas. Sem JS ou com movimento reduzido, aparece pronto.
 */
export function RevealTitle({ text, as: Tag = 'h1', className }: {
  text: string; as?: 'h1' | 'h2'; className?: string
}) {
  const ref = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const words = el.querySelectorAll<HTMLElement>('[data-w]')
    const ctx = gsap.context(() => {
      gsap.from(words, { yPercent: 70, opacity: 0, duration: 0.6, ease: 'power3.out', stagger: 0.06 })
    }, el)
    return () => ctx.revert()
  }, [text])
  return (
    <Tag ref={ref} aria-label={text} className={cn('font-display', className)}>
      <span aria-hidden="true">
        {text.split(' ').map((w, i) => (
          <span key={i} className="inline-block overflow-hidden pb-[0.08em] align-bottom">
            <span data-w className="inline-block">{w}</span>
            {i < text.split(' ').length - 1 && <span className="inline-block">&nbsp;</span>}
          </span>
        ))}
      </span>
    </Tag>
  )
}

/** Entrada escalonada dos blocos marcados com data-reveal dentro do container. */
export function useStagger(dep: unknown) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const items = el.querySelectorAll('[data-reveal]')
    if (!items.length) return
    const ctx = gsap.context(() => {
      gsap.from(items, { y: 14, opacity: 0, duration: 0.5, ease: 'power2.out', stagger: 0.07, delay: 0.15, clearProps: 'all' })
    }, el)
    return () => ctx.revert()
  }, [dep])
  return ref
}
