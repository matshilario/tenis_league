import type { Config } from 'tailwindcss'

const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`

const config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // marca (fixos)
        paper: v('paper'),
        ink: v('ink'),
        court: { DEFAULT: v('court'), deep: v('court-deep') },
        olive: { DEFAULT: v('olive'), soft: v('olive-soft') },
        lime: { DEFAULT: v('lime'), deep: v('lime-deep') },
        navy: v('navy'),
        clay: v('clay'),
        // semânticos
        background: v('background'),
        foreground: v('foreground'),
        card: { DEFAULT: v('card'), foreground: v('foreground') },
        muted: { DEFAULT: v('muted'), foreground: v('muted-foreground') },
        border: v('border'),
        input: v('input'),
        ring: v('ring'),
        primary: { DEFAULT: v('primary'), foreground: v('primary-foreground') },
        secondary: { DEFAULT: v('secondary'), foreground: v('secondary-foreground') },
        accent: { DEFAULT: v('accent'), foreground: v('accent-foreground') },
        destructive: { DEFAULT: v('destructive'), foreground: v('destructive-foreground') },
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        pixel: ['var(--font-pixel)', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        // escala: display fluida; texto de app em 15/16px
        'display': ['clamp(2.25rem, 1.6rem + 3.2vw, 4rem)', { lineHeight: '1.02', letterSpacing: '-0.02em' }],
        'title': ['clamp(1.6rem, 1.3rem + 1.4vw, 2.25rem)', { lineHeight: '1.1', letterSpacing: '-0.015em' }],
        'eyebrow': ['0.75rem', { lineHeight: '1.1', letterSpacing: '0.1em' }],
      },
      borderRadius: { lg: '14px', md: '10px', sm: '6px' },
      boxShadow: {
        card: '0 1px 0 rgb(var(--border)), 0 8px 24px -16px rgb(var(--shadow) / 0.35)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config

export default config
