'use client'

/**
 * "Patrocine este torneio" — página pública que a organização compartilha.
 *
 * Direção: um "termo oficial de adoção de parafusos". A seriedade editorial da liga
 * (Fraunces, papel creme, carimbo de laudo) contra o caos assumido da turma (ferragens
 * em pixel caindo da página). A piada é carinhosa: faltam parafusos, sobra amor ao tênis.
 */

import { useMutation, useQuery } from '@tanstack/react-query'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useEffect, useMemo, useRef, useState } from 'react'
import { FullLogo } from '@/components/Brand'
import { CourtStrip } from '@/components/court/CourtStrip'
import { Icon } from '@/components/Icon'
import { RevealTitle } from '@/components/RevealTitle'
import { Button, ErrorBox, Field, Input, Spinner, Textarea, buttonClass } from '@/components/ui'
import { api, errorMessage } from '@/lib/api'
import { fmtMoney, logoToPng, tierSprite } from '@/lib/sponsor'
import type { SponsorPage, Tier } from '@/lib/types'
import { cn, fmtDate } from '@/lib/utils'
import { PixelTool, type ToolName } from './PixelTool'
import { SponsorLogos } from './SponsorLogos'

// só em telas largas: no celular passariam por cima do texto
const FALLING: { tool: ToolName; left: string; delay: number; size: number }[] = [
  { tool: 'screw', left: '2%', delay: 0, size: 3 },
  { tool: 'nut', left: '18%', delay: 2.2, size: 3 },
  { tool: 'screw', left: '34%', delay: 4.1, size: 3 },
  { tool: 'screw', left: '64%', delay: 1.3, size: 4 },
  { tool: 'nut', left: '80%', delay: 3.4, size: 4 },
  { tool: 'screw', left: '92%', delay: 5.2, size: 3 },
]

export function SponsorLanding({ slug }: { slug: string }) {
  const q = useQuery({ queryKey: ['sponsor-page', slug], queryFn: () => api.sponsorPage(slug), retry: 0 })
  if (q.isLoading) return <div className="grid min-h-screen place-items-center"><Spinner /></div>
  if (q.isError || !q.data) {
    return (
      <div className="mx-auto grid min-h-screen max-w-md place-items-center px-4 text-center">
        <div className="space-y-4">
          <PixelTool name="screw" scale={6} className="mx-auto" />
          <h1 className="text-title font-semibold">Esse parafuso rolou para longe.</h1>
          <p className="text-muted-foreground">{errorMessage(q.error)}</p>
        </div>
        <CourtStrip />
      </div>
    )
  }
  return <Landing slug={slug} page={q.data} />
}

function Landing({ slug, page }: { slug: string; page: SponsorPage }) {
  const root = useRef<HTMLDivElement>(null)
  const [tierId, setTierId] = useState<string | null>(null)
  const firstOpen = page.tiers.find((t) => t.available)

  // ferragens caindo no topo + blocos entrando ao rolar (desligado em movimento reduzido)
  useEffect(() => {
    const el = root.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    gsap.registerPlugin(ScrollTrigger)
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('[data-fall]').forEach((n) => {
        gsap.fromTo(n, { y: -60, rotation: 0, autoAlpha: 0.9 }, {
          y: () => (n.parentElement?.clientHeight ?? 600) + 40, rotation: 360,
          duration: 7, ease: 'power1.in', repeat: -1, delay: Number(n.dataset.delay || 0),
        })
      })
      gsap.utils.toArray<HTMLElement>('[data-sr]').forEach((n) => {
        gsap.from(n, {
          y: 24, opacity: 0, duration: 0.7, ease: 'power3.out', clearProps: 'all',
          scrollTrigger: { trigger: n, start: 'top 85%', once: true },
        })
      })
      gsap.from('[data-stamp]', { scale: 2.2, rotation: -24, opacity: 0, duration: 0.45, delay: 0.9, ease: 'back.out(2)' })
    }, el)
    const refresh = () => ScrollTrigger.refresh()
    document.fonts?.ready.then(refresh)
    return () => ctx.revert()
  }, [])

  const choose = (t: Tier) => {
    setTierId(t.id)
    document.getElementById('termo')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const starts = page.categories.map((c) => c.start_date).filter(Boolean).sort()[0]
  const ends = page.categories.map((c) => c.final_date).filter(Boolean).sort().at(-1)
  const champs = page.categories.filter((c) => c.champion)

  return (
    <div ref={root} className="relative overflow-x-clip"
      style={{ paddingBottom: 'calc(var(--court-h, 0px) + 2rem)' }}>
      {/* ------------------------------------------------------------- HERO */}
      <header className="relative isolate overflow-hidden border-b border-olive/30">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
          {FALLING.map((f, i) => (
            <span key={i} data-fall data-delay={f.delay}
              className="absolute top-0 hidden opacity-0 sm:block" style={{ left: f.left }}>
              <PixelTool name={f.tool} scale={f.size} />
            </span>
          ))}
        </div>

        <div className="mx-auto max-w-5xl px-4 pb-16 pt-8 sm:pb-24">
          <div className="flex items-center justify-between gap-4">
            <FullLogo className="w-[150px] sm:w-[190px]" />
            <a href="#cotas" className={buttonClass('secondary', 'sm')}>Ver cotas</a>
          </div>

          <p className="mt-14 font-pixel text-eyebrow uppercase text-court sm:mt-20">
            Patrocine a {page.season_name}
          </p>
          <RevealTitle
            text="Perdemos uns parafusos. A paixão pelo tênis ficou inteira."
            className="mt-3 max-w-4xl text-[clamp(2.5rem,1.4rem+5vw,5.6rem)] font-semibold leading-[0.98] tracking-[-0.025em]" />

          <div className="mt-8 grid gap-8 sm:grid-cols-[1.4fr_1fr] sm:items-end">
            <p className="max-w-xl text-lg leading-relaxed text-ink/85 dark:text-foreground/85">
              A Duvis Cup é a liga de uma turma que joga tênis com muito mais coração do que juízo.
              Gente boa, que respeita o adversário e não recusa um super tie-break. Faltam alguns
              parafusos na cabeça de cada um, e é aí que entra a sua marca.
            </p>
            <div className="relative justify-self-start sm:justify-self-end">
              <div data-stamp className="rotate-[-7deg] rounded-md border-[3px] border-destructive/80 px-4 py-2 text-destructive/90 mix-blend-multiply dark:mix-blend-normal">
                <p className="font-pixel text-[11px] uppercase tracking-wider">Laudo da organização</p>
                <p className="font-display text-xl font-semibold leading-tight">Parafuso a menos,<br />coração a mais.</p>
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            <a href="#cotas" className={buttonClass('accent', 'lg')}>
              <Icon name="money" className="h-5 w-5" /> Quero apertar um parafuso
            </a>
            <a href="#vitrine" className={buttonClass('ghost', 'lg')}>Onde minha marca aparece</a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-24 px-4 py-16 sm:space-y-32">
        {/* ------------------------------------------------- FICHA TÉCNICA */}
        <section aria-labelledby="ficha" data-sr>
          <SectionTitle id="ficha" kicker="Prontuário" title="Ficha técnica do torneio" />
          <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-4">
            <Stat label="Pacientes em quadra" value={page.players} />
            <Stat label="Jogos disputados" value={page.matches_played} />
            <Stat label={page.categories.length === 1 ? 'Categoria' : 'Categorias'} value={page.categories.length} />
            <Stat label="Período" value={starts ? `${fmtDate(starts)}${ends ? ` → ${fmtDate(ends)}` : ''}` : 'em breve'} small />
          </dl>
          {champs.length > 0 && (
            <p className="mt-4 text-sm text-muted-foreground">
              Campeão{champs.length > 1 ? 's' : ''}: {champs.map((c) => `${c.champion} (${c.name})`).join(' · ')}
            </p>
          )}
          {page.pitch && (
            <blockquote className="mt-8 max-w-2xl border-l-4 border-lime pl-4 text-lg italic text-ink/85 dark:text-foreground/85">
              {page.pitch}
              <footer className="mt-2 font-pixel text-[11px] not-italic uppercase tracking-wider text-muted-foreground">Recado da organização</footer>
            </blockquote>
          )}
        </section>

        {/* ------------------------------------------------- POR QUE */}
        <section aria-labelledby="porque">
          <SectionTitle id="porque" kicker="Diagnóstico" title="Por que patrocinar gente assim?" />
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              { t: 'Gente boa, com laudo', d: 'Ninguém aqui joga por dinheiro: a gente joga porque não consegue parar. Respeito na quadra, resenha fora dela.' },
              { t: 'Amor ao esporte em estado bruto', d: 'Tem cãibra no meio do set, macaco roubando bola e elástico amarrado no poste da rede. Desistência, não tem.' },
              { t: 'Sua marca na foto do campeão', d: 'Cada resultado e cada campeão compartilhado no WhatsApp sai com a sua logo, que também fica estampada no site.' },
            ].map((c, i) => (
              <article key={c.t} data-sr className="rounded-lg border bg-card p-5 shadow-card">
                <p className="font-pixel text-[11px] uppercase tracking-wider text-court">Sintoma {i + 1}</p>
                <h3 className="mt-2 text-xl font-semibold leading-snug">{c.t}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{c.d}</p>
              </article>
            ))}
          </div>
        </section>

        {/* ------------------------------------------------- COTAS */}
        <section id="cotas" aria-labelledby="cotas-t" className="scroll-mt-6">
          <SectionTitle id="cotas-t" kicker="Caixa de ferramentas" title="Escolha seu parafuso" />
          <p className="mt-3 max-w-xl text-muted-foreground">
            Cada cota aperta um pedacinho da turma. Os valores ajudam com bolas, troféu, quadra e
            a resenha da final.
          </p>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {page.tiers.map((t) => <TierCard key={t.id} tier={t} open={page.open}
              selected={tierId === t.id} onChoose={() => choose(t)} />)}
          </div>
        </section>

        {/* ------------------------------------------------- VITRINE */}
        <section id="vitrine" aria-labelledby="vitrine-t" className="scroll-mt-6">
          <SectionTitle id="vitrine-t" kicker="Vitrine" title="Onde sua marca aparece" />
          <div className="mt-8 grid items-center gap-10 md:grid-cols-[minmax(0,420px)_1fr]">
            <ChampionPreview season={page.season_name} />
            <ul className="space-y-5">
              {[
                ['Cartão do campeão', 'A imagem que roda nos grupos de WhatsApp quando sai o campeão. As cotas maiores aparecem em destaque.'],
                ['Cartões de resultado', 'Todo placar compartilhado leva as logos do torneio no rodapé.'],
                ['Site do torneio', 'A faixa "Parafusos apertados por" estampa o site durante o prazo da cota.'],
                ['Grupo da liga', 'A organização anuncia sua entrada para a turma toda. Com carinho e zoeira na medida.'],
              ].map(([t, d]) => (
                <li key={t} data-sr className="flex gap-3">
                  <PixelTool name="screw" scale={2} className="mt-1 shrink-0" />
                  <div>
                    <p className="font-semibold">{t}</p>
                    <p className="text-[15px] text-muted-foreground">{d}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {page.sponsors.length > 0 && (
          <section aria-labelledby="ja" data-sr>
            <SectionTitle id="ja" kicker="Mural" title="Quem já apertou um parafuso" />
            <SponsorLogos sponsors={page.sponsors} size="lg" className="mt-8" />
          </section>
        )}

        {/* ------------------------------------------------- TERMO */}
        <section id="termo" aria-labelledby="termo-t" className="scroll-mt-6">
          <SectionTitle id="termo-t" kicker="Papelada" title="Termo de adoção de parafusos" />
          {page.open && firstOpen
            ? <AdoptionForm slug={slug} tiers={page.tiers} tierId={tierId ?? firstOpen.id} onTier={setTierId} />
            : (
              <p className="mt-6 max-w-xl rounded-lg border border-dashed p-5 text-muted-foreground">
                As cotas deste torneio estão fechadas no momento. Quer ajudar mesmo assim? Fale com a
                organização, que a gente sempre arruma um parafuso.
              </p>
            )}
        </section>
      </main>

      <footer className="mx-auto max-w-5xl px-4 pb-8 text-sm text-muted-foreground">
        Duvis Cup · liga amadora de tênis da nossa turma. Nenhum parafuso foi maltratado na produção desta página.
      </footer>
      <CourtStrip />
    </div>
  )
}

function SectionTitle({ id, kicker, title }: { id: string; kicker: string; title: string }) {
  return (
    <div>
      <p className="font-pixel text-eyebrow uppercase text-court">{kicker}</p>
      <h2 id={id} className="mt-2 text-[clamp(1.9rem,1.3rem+2.4vw,3rem)] font-semibold leading-[1.05] tracking-[-0.02em]">{title}</h2>
    </div>
  )
}

function Stat({ label, value, small }: { label: string; value: React.ReactNode; small?: boolean }) {
  return (
    <div className="bg-card p-5">
      <dt className="font-pixel text-[11px] uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className={cn('mt-2 font-display font-semibold tabular', small ? 'text-xl' : 'text-5xl')}>{value}</dd>
    </div>
  )
}

function TierCard({ tier, open, selected, onChoose }: {
  tier: Tier; open: boolean; selected: boolean; onChoose: () => void
}) {
  const left = tier.slots === null ? null : Math.max(0, tier.slots - tier.taken)
  const hero = tier.weight >= 3
  return (
    <article data-sr className={cn(
      'relative flex flex-col rounded-lg border bg-card p-6 shadow-card transition-shadow',
      hero && 'border-court bg-court-deep text-primary-foreground dark:bg-court/25 dark:text-foreground',
      selected && 'ring-2 ring-lime ring-offset-2 ring-offset-background',
      !tier.available && 'opacity-70',
    )}>
      <div className="flex items-start justify-between gap-3">
        <PixelTool name={tierSprite(tier.weight)} scale={4} />
        <span className={cn('rounded-full px-2.5 py-1 font-pixel text-[10px] uppercase tracking-wider',
          hero ? 'bg-lime text-accent-foreground' : 'bg-muted text-muted-foreground')}>
          {!tier.available ? 'Esgotada' : left === null ? 'Vagas à vontade' : left === 1 ? 'Última vaga' : `${left} vagas`}
        </span>
      </div>
      <h3 className="mt-5 text-2xl font-semibold">{tier.name}</h3>
      {tier.tagline && <p className={cn('mt-1 text-[15px]', hero ? 'opacity-85' : 'text-muted-foreground')}>{tier.tagline}</p>}
      <p className="mt-5 font-display text-4xl font-semibold tabular">{fmtMoney(tier.price_cents)}</p>
      <ul className="mt-5 flex-1 space-y-2 text-[15px]">
        {(tier.perks ?? []).map((p) => (
          <li key={p} className="flex gap-2">
            <Icon name="check" className={cn('mt-0.5 h-4 w-4 shrink-0', hero ? 'text-lime' : 'text-court')} /> {p}
          </li>
        ))}
        <li className={cn('flex gap-2 text-sm', hero ? 'opacity-75' : 'text-muted-foreground')}>
          <Icon name="clock" className="mt-0.5 h-4 w-4 shrink-0" /> Logo no site por {tier.visibility_days} dias
        </li>
      </ul>
      <Button className="mt-6 w-full" variant={hero ? 'accent' : 'primary'}
        disabled={!open || !tier.available} onClick={onChoose}>
        {!tier.available ? 'Esgotada' : selected ? 'Escolhida' : 'Quero esta'}
      </Button>
    </article>
  )
}

/** Prévia do cartão do campeão com o espaço da logo (o cartão real sai igual). */
function ChampionPreview({ season }: { season: string }) {
  return (
    <figure data-sr aria-label="Exemplo do cartão do campeão com espaço para a sua logo"
      className="rotate-[-1.5deg] overflow-hidden rounded-lg bg-court-deep p-6 text-[#f6efdf] shadow-[0_24px_60px_-28px_rgb(0_0_0/0.6)]">
      <p className="font-pixel text-[11px] uppercase tracking-wider text-lime">{season} · Campeão</p>
      <p className="mt-3 font-display text-4xl font-semibold leading-none">Fulano<br />de Tal</p>
      <p className="mt-3 font-pixel text-sm text-[#f6efdf]/80">6/4 3/6 [10/8]</p>
      <div className="mt-6 flex items-center gap-3 border-t border-[#f6efdf]/20 pt-4">
        <span className="font-pixel text-[10px] uppercase tracking-wider text-[#f6efdf]/70">Oferecimento</span>
        <span className="grid h-12 flex-1 place-items-center rounded-md border-2 border-dashed border-lime/80 font-pixel text-xs uppercase text-lime">
          Sua logo aqui
        </span>
      </div>
    </figure>
  )
}

function AdoptionForm({ slug, tiers, tierId, onTier }: {
  slug: string; tiers: Tier[]; tierId: string; onTier: (id: string) => void
}) {
  const [f, setF] = useState({ company: '', contact_name: '', phone: '', email: '', website: '', instagram: '', message: '' })
  const [logo, setLogo] = useState<string | null>(null)
  const [logoErr, setLogoErr] = useState<string | null>(null)
  const tier = useMemo(() => tiers.find((t) => t.id === tierId), [tiers, tierId])
  const send = useMutation({
    mutationFn: () => api.sponsorSubmit(slug, {
      tier_id: tierId, ...f, email: f.email || null, website: f.website || null,
      instagram: f.instagram || null, message: f.message || null, logo,
    }),
  })
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF({ ...f, [k]: e.target.value })

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    setLogoErr(null)
    if (!file) return
    try { setLogo(await logoToPng(file)) } catch (err) { setLogo(null); setLogoErr((err as Error).message) }
  }

  if (send.isSuccess) {
    return (
      <div role="status" className="mt-8 max-w-2xl rounded-lg border-2 border-court bg-card p-6 shadow-card">
        <div className="flex items-center gap-4">
          <PixelTool name={tierSprite(tier?.weight ?? 1)} scale={5} />
          <div>
            <p className="font-pixel text-[11px] uppercase tracking-wider text-court">Termo recebido</p>
            <p className="font-display text-2xl font-semibold">Parafuso apertado (quase)!</p>
          </div>
        </div>
        <p className="mt-4 text-[15px]">
          A organização recebeu sua ficha da cota <strong>{tier?.name}</strong> e vai te chamar no WhatsApp.
          Sua logo entra no site assim que a cota for confirmada.
        </p>
        {send.data.payment && (
          <div className="mt-4 rounded-md bg-muted p-4">
            <p className="font-pixel text-[11px] uppercase tracking-wider text-muted-foreground">Como pagar</p>
            <p className="mt-1 whitespace-pre-line text-[15px]">{send.data.payment}</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); send.mutate() }}
      className="mt-8 grid gap-6 rounded-lg border bg-card p-5 shadow-card sm:p-8 md:grid-cols-[1fr_260px]">
      <div className="space-y-4">
        <fieldset>
          <legend className="text-sm font-semibold">Cota</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {tiers.map((t) => (
              <label key={t.id} className={cn('flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold',
                tierId === t.id ? 'border-court bg-court/10' : 'hover:bg-muted', !t.available && 'pointer-events-none opacity-50')}>
                <input type="radio" name="tier" className="accent-[rgb(var(--court))]" checked={tierId === t.id}
                  disabled={!t.available} onChange={() => onTier(t.id)} />
                {t.name} · {fmtMoney(t.price_cents)}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Empresa ou marca"><Input required minLength={2} value={f.company} onChange={set('company')} autoComplete="organization" /></Field>
          <Field label="Seu nome"><Input required minLength={2} value={f.contact_name} onChange={set('contact_name')} autoComplete="name" /></Field>
          <Field label="WhatsApp" hint="A organização te chama por aqui."><Input required inputMode="tel" placeholder="(92) 99999-9999" value={f.phone} onChange={set('phone')} autoComplete="tel" /></Field>
          <Field label="E-mail (opcional)"><Input type="email" value={f.email} onChange={set('email')} autoComplete="email" /></Field>
          <Field label="Site (opcional)"><Input placeholder="suamarca.com.br" value={f.website} onChange={set('website')} /></Field>
          <Field label="Instagram (opcional)"><Input placeholder="@suamarca" value={f.instagram} onChange={set('instagram')} /></Field>
        </div>
        <Field label="Recado para a turma (opcional)"><Textarea value={f.message} onChange={set('message')} maxLength={1000} /></Field>
      </div>

      <div className="space-y-2">
        <span className="text-sm font-semibold">Logo</span>
        <label className="group grid aspect-[4/3] cursor-pointer place-items-center rounded-md border-2 border-dashed border-input bg-[length:16px_16px] bg-[conic-gradient(rgb(var(--muted))_25%,transparent_0_50%,rgb(var(--muted))_0_75%,transparent_0)] p-4 text-center hover:border-court">
          {logo
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={logo} alt="Prévia da sua logo" className="max-h-full max-w-full object-contain" />
            : (
              <span className="text-sm text-muted-foreground">
                <Icon name="upload" className="mx-auto mb-2 block h-8 w-8 text-court" />
                Enviar logo<br /><span className="text-xs">PNG com fundo transparente fica melhor</span>
              </span>
            )}
          <input type="file" accept="image/*" className="sr-only" onChange={pick} />
        </label>
        {logo && <button type="button" onClick={() => setLogo(null)} className="text-xs font-semibold text-muted-foreground underline">Remover logo</button>}
        {logoErr && <p className="text-xs text-destructive">{logoErr}</p>}
        <p className="text-xs text-muted-foreground">Sem a logo agora? Pode mandar depois pelo WhatsApp.</p>
      </div>

      <div className="space-y-3 md:col-span-2">
        <ErrorBox error={send.isError ? errorMessage(send.error) : null} />
        <Button type="submit" size="lg" variant="accent" disabled={send.isPending} className="w-full sm:w-auto">
          {send.isPending ? 'Enviando…' : `Assinar o termo${tier ? ` · ${tier.name}` : ''}`}
        </Button>
        <p className="text-xs text-muted-foreground">
          Ao enviar, você só manifesta interesse: nada é cobrado aqui. A organização confirma tudo com você.
        </p>
      </div>
    </form>
  )
}
