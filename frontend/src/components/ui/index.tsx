'use client'

import { forwardRef } from 'react'
import type { IconName } from '@/lib/icons'
import { cn } from '@/lib/utils'
import { Icon } from '../Icon'

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

export const buttonClass = (variant: BtnProps['variant'] = 'primary', size: BtnProps['size'] = 'md') => cn(
  'inline-flex select-none items-center justify-center gap-1.5 rounded-md font-semibold transition-[background-color,transform,box-shadow] duration-150',
  'active:translate-y-px disabled:pointer-events-none disabled:opacity-50',
  size === 'sm' && 'h-8 px-3 text-sm',
  size === 'md' && 'h-10 px-4 text-[15px]',
  size === 'lg' && 'h-12 px-5 text-base',
  variant === 'primary' && 'bg-primary text-primary-foreground shadow-[inset_0_-2px_0_rgb(0_0_0/0.18)] hover:bg-primary/90',
  variant === 'accent' && 'bg-lime text-accent-foreground shadow-[inset_0_-2px_0_rgb(0_0_0/0.14)] hover:bg-lime/85',
  variant === 'secondary' && 'bg-secondary text-secondary-foreground hover:bg-secondary/70',
  variant === 'ghost' && 'text-foreground hover:bg-muted',
  variant === 'danger' && 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
)

export const Button = forwardRef<HTMLButtonElement, BtnProps>(function Button(
  { className, variant, size, ...props }, ref,
) {
  return <button ref={ref} className={cn(buttonClass(variant, size), className)} {...props} />
})

const field = 'w-full rounded-md border border-input bg-card px-3 text-[15px] text-foreground placeholder:text-muted-foreground/70 focus-visible:border-court focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40'

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(field, 'h-10', className)} {...props} />
  },
)

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(field, 'h-10 px-2', className)} {...props} />
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(field, 'min-h-[84px] py-2', className)} {...props} />
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-semibold">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
    </label>
  )
}

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-lg border bg-card p-4 shadow-card', className)} {...props} />
}

/** Cartão com faixa de título, como os painéis de placar de clube. */
export function Panel({ title, icon, tone = 'soft', action, className, bodyClassName, children, ...rest }: {
  title: React.ReactNode
  icon?: IconName
  tone?: 'soft' | 'olive' | 'court'
  action?: React.ReactNode
  className?: string
  bodyClassName?: string
  children: React.ReactNode
} & Omit<React.HTMLAttributes<HTMLElement>, 'title'> & { 'data-reveal'?: boolean }) {
  return (
    <section className={cn('overflow-hidden rounded-lg border bg-card shadow-card', className)} {...rest}>
      <header className={cn('flex items-center justify-between gap-2 px-4 py-2.5',
        tone === 'soft' && 'bg-olive-soft text-ink dark:text-foreground',
        tone === 'olive' && 'bg-olive text-paper',
        tone === 'court' && 'bg-court-deep text-paper dark:bg-court/30')}>
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
          {icon && <Icon name={icon} className="h-5 w-5 opacity-90" />}
          {title}
        </h2>
        {action}
      </header>
      <div className={cn('p-4', bodyClassName)}>{children}</div>
    </section>
  )
}

export function Badge({ className, tone = 'neutral', ...props }:
  React.HTMLAttributes<HTMLSpanElement> & { tone?: 'neutral' | 'good' | 'warn' | 'bad' | 'info' | 'lime' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-sm px-1.5 py-0.5 text-[11px] font-semibold leading-none',
        tone === 'neutral' && 'bg-muted text-muted-foreground',
        tone === 'good' && 'bg-court/15 text-court dark:text-[rgb(120_200_150)]',
        tone === 'warn' && 'bg-clay/20 text-[rgb(140_86_36)] dark:text-clay',
        tone === 'bad' && 'bg-destructive/10 text-destructive',
        tone === 'info' && 'bg-navy/10 text-navy dark:bg-navy/40 dark:text-[rgb(170_196_225)]',
        tone === 'lime' && 'bg-lime text-accent-foreground',
        className,
      )}
      {...props}
    />
  )
}

export function ErrorBox({ error }: { error: string | null | undefined }) {
  if (!error) return null
  return (
    <div role="alert" className="flex gap-2 whitespace-pre-line rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
      <Icon name="warning" className="mt-0.5 h-4 w-4" />
      <span>{error}</span>
    </div>
  )
}

export function Modal({ open, onClose, title, children }:
  { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      onClick={onClose}>
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-xl border bg-background p-5 shadow-xl animate-in slide-in-from-bottom-4 fade-in-0 sm:max-w-lg sm:rounded-xl"
        onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={title}
        onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-display text-xl font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Fechar">
            <Icon name="close" className="h-6 w-6" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Spinner({ label = 'Carregando…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground" role="status">
      <span className="inline-block h-2.5 w-2.5 animate-bounce rounded-full bg-lime shadow-[0_6px_0_-3px_rgb(var(--shadow)/0.3)]" />
      {label}
    </div>
  )
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-md border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">{children}</p>
}
