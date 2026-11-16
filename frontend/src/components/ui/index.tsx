'use client'

import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
}

export const Button = forwardRef<HTMLButtonElement, BtnProps>(function Button(
  { className, variant = 'primary', size = 'md', ...props }, ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors',
        'disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        size === 'sm' ? 'h-8 px-3 text-sm' : 'h-10 px-4',
        variant === 'primary' && 'bg-primary text-primary-foreground hover:bg-primary/90',
        variant === 'secondary' && 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        variant === 'ghost' && 'hover:bg-muted',
        variant === 'danger' && 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        className,
      )}
      {...props}
    />
  )
})

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          'h-10 w-full rounded-md border border-input bg-background px-3 text-sm',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          className,
        )}
        {...props}
      />
    )
  },
)

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn('h-10 w-full rounded-md border border-input bg-background px-2 text-sm', className)}
      {...props}
    />
  )
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn('min-h-[80px] w-full rounded-md border border-input bg-background p-3 text-sm', className)}
      {...props}
    />
  )
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
    </label>
  )
}

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-lg border bg-card p-4 shadow-sm', className)} {...props} />
}

export function Badge({ className, tone = 'neutral', ...props }:
  React.HTMLAttributes<HTMLSpanElement> & { tone?: 'neutral' | 'good' | 'warn' | 'bad' | 'info' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium whitespace-nowrap',
        tone === 'neutral' && 'bg-muted text-muted-foreground',
        tone === 'good' && 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
        tone === 'warn' && 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
        tone === 'bad' && 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
        tone === 'info' && 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
        className,
      )}
      {...props}
    />
  )
}

export function ErrorBox({ error }: { error: string | null | undefined }) {
  if (!error) return null
  return (
    <div className="whitespace-pre-line rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
      {error}
    </div>
  )
}

export function Modal({ open, onClose, title, children }:
  { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
         onClick={onClose}>
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-xl bg-background p-5 shadow-xl sm:max-w-lg sm:rounded-xl"
           onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={title}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="text-2xl leading-none text-muted-foreground" aria-label="Fechar">×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Spinner() {
  return <div className="py-10 text-center text-sm text-muted-foreground">Carregando…</div>
}
