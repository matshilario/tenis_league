'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Icon } from '@/components/Icon'
import { PixelArt } from '@/components/sponsors/PixelArt'
import {
  Badge, Button, Card, Empty, ErrorBox, Field, Input, Select, Spinner, Textarea, buttonClass,
} from '@/components/ui'
import { api, errorMessage } from '@/lib/api'
import { tierPrimate } from '@/lib/pixelArt'
import { fmtMoney, logoToPng } from '@/lib/sponsor'
import type { Sponsor, Sponsorship, SponsorStatus, Tier } from '@/lib/types'
import { useCategory } from '@/lib/useCategory'
import { fmtDate, fmtPhone } from '@/lib/utils'

const STATUS: Record<SponsorStatus, { label: string; tone: 'warn' | 'good' | 'bad' }> = {
  pending: { label: 'aguardando', tone: 'warn' },
  approved: { label: 'aprovado', tone: 'good' },
  rejected: { label: 'recusado', tone: 'bad' },
}

const shareText = (s: Sponsorship) =>
  `🐒 A ${s.season_name} está procurando patrocinadores! Escolha seu primata e ` +
  `estampe sua marca no cartão do campeão: ${s.url}`

export function SponsorTab() {
  const { season, seasons } = useCategory()
  const q = useQuery({
    queryKey: ['sponsorship', season?.id], queryFn: () => api.admin.sponsorship(season!.id), enabled: !!season,
  })
  if (seasons.isLoading || q.isLoading) return <Spinner />
  if (!season) return <Empty>Crie uma temporada primeiro (aba Temporada).</Empty>
  if (!q.data) return <ErrorBox error={errorMessage(q.error)} />
  return (
    <div className="space-y-6">
      <LinkCard s={q.data} />
      {q.data.slug && <Sponsors seasonId={season.id} tiers={q.data.tiers} />}
      {q.data.slug && <Tiers seasonId={season.id} tiers={q.data.tiers} />}
    </div>
  )
}

function useSponsorRefresh(seasonId: string) {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: ['sponsorship', seasonId] })
    qc.invalidateQueries({ queryKey: ['admin-sponsors', seasonId] })
    qc.invalidateQueries({ queryKey: ['sponsors-active'] })
  }
}

function LinkCard({ s }: { s: Sponsorship }) {
  const refresh = useSponsorRefresh(s.season_id)
  const [pitch, setPitch] = useState(s.pitch ?? '')
  const [payment, setPayment] = useState(s.payment ?? '')
  const [copied, setCopied] = useState(false)
  const m = useMutation({ mutationFn: (fn: () => Promise<unknown>) => fn(), onSuccess: refresh })
  useEffect(() => { setPitch(s.pitch ?? ''); setPayment(s.payment ?? '') }, [s.pitch, s.payment])

  async function copy() {
    if (!s.url) return
    try { await navigator.clipboard.writeText(s.url); setCopied(true); setTimeout(() => setCopied(false), 2000) }
    catch { window.prompt('Copie o link:', s.url) }
  }

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Patrocine a {s.season_name}</h2>
          <p className="text-sm text-muted-foreground">
            Link público com as cotas. Quem patrocina fica com a logo no site e nos cartões de resultado e de campeão.
          </p>
        </div>
        <Badge tone={s.open ? 'good' : 'neutral'}>{s.open ? 'cotas abertas' : s.slug ? 'cotas fechadas' : 'desligado'}</Badge>
      </div>

      {s.url && (
        <div className="space-y-2">
          <Input readOnly value={s.url} aria-label="Link de patrocínio" className="font-mono text-sm"
            onFocus={(e) => e.currentTarget.select()} />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={copy}><Icon name="copy" className="h-4 w-4" /> {copied ? 'Copiado!' : 'Copiar'}</Button>
            <a className={buttonClass('accent', 'sm')} target="_blank" rel="noopener noreferrer"
              href={`https://wa.me/?text=${encodeURIComponent(shareText(s))}`}>
              <Icon name="chat" className="h-4 w-4" /> Enviar no WhatsApp
            </a>
            <a className={buttonClass('secondary', 'sm')} href={s.url} target="_blank" rel="noopener noreferrer">
              <Icon name="eye" className="h-4 w-4" /> Ver página
            </a>
            <Button size="sm" variant="ghost" disabled={m.isPending}
              onClick={() => confirm('Gerar outro link? O atual para de funcionar.') && m.mutate(() => api.admin.newSponsorLink(s.season_id))}>
              <Icon name="refresh" className="h-4 w-4" /> Novo link
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {s.open
          ? <Button variant="secondary" disabled={m.isPending} onClick={() => m.mutate(() => api.admin.setSponsorship(s.season_id, { open: false }))}>Fechar cotas</Button>
          : <Button disabled={m.isPending} onClick={() => m.mutate(() => api.admin.setSponsorship(s.season_id, { open: true }))}>
            {s.slug ? 'Reabrir cotas' : 'Criar link de patrocínio'}
          </Button>}
      </div>

      {s.slug && (
        <form className="grid gap-4 md:grid-cols-2" onSubmit={(e) => {
          e.preventDefault()
          m.mutate(() => api.admin.setSponsorship(s.season_id, { pitch, payment }))
        }}>
          <Field label="Recado da organização (aparece na página)" hint="Opcional. Ex.: para que o dinheiro vai.">
            <Textarea value={pitch} onChange={(e) => setPitch(e.target.value)} maxLength={2000} />
          </Field>
          <Field label="Como pagar (mostrado depois da ficha enviada)" hint="Ex.: chave Pix e nome do recebedor.">
            <Textarea value={payment} onChange={(e) => setPayment(e.target.value)} maxLength={2000} />
          </Field>
          <div><Button type="submit" size="sm" disabled={m.isPending}>Salvar textos</Button></div>
        </form>
      )}
      <ErrorBox error={m.isError ? errorMessage(m.error) : null} />
    </Card>
  )
}

function Sponsors({ seasonId, tiers }: { seasonId: string; tiers: Tier[] }) {
  const q = useQuery({ queryKey: ['admin-sponsors', seasonId], queryFn: () => api.admin.sponsors(seasonId) })
  return (
    <section className="space-y-3">
      <h2 className="font-semibold">Patrocinadores</h2>
      {q.isLoading ? <Spinner /> : !q.data?.length
        ? <Empty>Nenhuma ficha ainda. Compartilhe o link!</Empty>
        : q.data.map((s) => <SponsorRow key={s.id} s={s} tiers={tiers} />)}
    </section>
  )
}

/** Logo da ficha via endpoint autenticado (a URL pública só serve aprovados). */
function useAdminLogo(s: Sponsor) {
  const [src, setSrc] = useState<string | null>(null)
  useEffect(() => {
    if (!s.logo_url) { setSrc(null); return }
    let url: string | null = null
    let alive = true
    api.admin.sponsorLogo(s.id).then((b) => {
      if (!alive) return
      url = URL.createObjectURL(b)
      setSrc(url)
    }).catch(() => alive && setSrc(null))
    return () => { alive = false; if (url) URL.revokeObjectURL(url) }
  }, [s.id, s.logo_url])
  return src
}

function SponsorRow({ s, tiers }: { s: Sponsor; tiers: Tier[] }) {
  const refresh = useSponsorRefresh(s.season_id)
  const [err, setErr] = useState<string | null>(null)
  const m = useMutation({
    mutationFn: (fn: () => Promise<unknown>) => fn(),
    onMutate: () => setErr(null),
    onSuccess: refresh,
    onError: (e) => setErr(errorMessage(e)),
  })
  const st = STATUS[s.status]
  const logoSrc = useAdminLogo(s)

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    try { const logo = await logoToPng(f); m.mutate(() => api.admin.patchSponsor(s.id, { logo })) }
    catch (x) { setErr((x as Error).message) }
  }

  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-start gap-4">
        <label className="grid h-16 w-28 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-md border bg-[#fcf8ee] p-1.5"
          title="Trocar logo">
          {logoSrc
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={logoSrc} alt={`Logo ${s.company}`} className="max-h-full max-w-full object-contain" />
            : <span className="text-center text-xs text-muted-foreground"><Icon name="upload" className="mx-auto h-5 w-5" />sem logo</span>}
          <input type="file" accept="image/*" className="sr-only" onChange={upload} />
        </label>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{s.company}</span>
            <Badge tone={st.tone}>{st.label}</Badge>
            {s.tier_name && <Badge tone="lime">{s.tier_name}</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">
            {s.contact_name}
            {s.phone && <> · <a className="underline" href={`https://wa.me/${s.phone}`} target="_blank" rel="noopener noreferrer">{fmtPhone(s.phone)}</a></>}
            {s.email && <> · {s.email}</>}
            {s.instagram && <> · @{s.instagram}</>}
            {s.website && <> · {s.website}</>}
          </p>
          {s.message && <p className="mt-1 text-sm italic">“{s.message}”</p>}
          <p className="mt-1 text-xs text-muted-foreground">
            Ficha de {fmtDate(s.created_at)}
            {s.status === 'approved' && s.visible_until && <> · logo no site até {fmtDate(s.visible_until)}</>}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        {s.status !== 'approved' && (
          <Button size="sm" disabled={m.isPending} onClick={() => m.mutate(() => api.admin.patchSponsor(s.id, { status: 'approved' }))}>
            <Icon name="check" className="h-4 w-4" /> Aprovar (pagamento ok)
          </Button>
        )}
        {s.status === 'pending' && (
          <Button size="sm" variant="ghost" disabled={m.isPending} onClick={() => m.mutate(() => api.admin.patchSponsor(s.id, { status: 'rejected' }))}>Recusar</Button>
        )}
        <Select aria-label="Cota" className="h-8 w-auto text-sm" value={s.tier_id ?? ''}
          onChange={(e) => e.target.value && m.mutate(() => api.admin.patchSponsor(s.id, { tier_id: e.target.value }))}>
          {!s.tier_id && <option value="">Sem cota</option>}
          {tiers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </Select>
        {s.status === 'approved' && (
          <label className="flex items-center gap-1.5 text-sm">
            <span className="text-muted-foreground">No site até</span>
            <Input type="date" className="h-8 w-auto" value={s.visible_until ?? ''}
              onChange={(e) => e.target.value && m.mutate(() => api.admin.patchSponsor(s.id, { visible_until: e.target.value }))} />
          </label>
        )}
        <Button size="sm" variant="ghost" className="ml-auto text-destructive" disabled={m.isPending}
          onClick={() => confirm(`Remover ${s.company}?`) && m.mutate(() => api.admin.deleteSponsor(s.id))}>
          <Icon name="trash" className="h-4 w-4" /> Remover
        </Button>
      </div>
      <ErrorBox error={err} />
    </Card>
  )
}

const BLANK = { name: '', tagline: '', price: '', slots: '', visibility_days: '60', perks: '', weight: '1' }

function Tiers({ seasonId, tiers }: { seasonId: string; tiers: Tier[] }) {
  const [editing, setEditing] = useState<string | 'new' | null>(null)
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Cotas</h2>
        <Button size="sm" variant="secondary" onClick={() => setEditing('new')}><Icon name="plus" className="h-4 w-4" /> Nova cota</Button>
      </div>
      {editing === 'new' && <TierForm seasonId={seasonId} onDone={() => setEditing(null)} />}
      <div className="grid gap-3 md:grid-cols-3">
        {tiers.map((t) => editing === t.id
          ? <div key={t.id} className="md:col-span-3"><TierForm seasonId={seasonId} tier={t} onDone={() => setEditing(null)} /></div>
          : (
            <Card key={t.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <PixelArt name={tierPrimate(t.weight)} scale={3} />
                <Badge>{t.slots === null ? `${t.taken} aprovados` : `${t.taken}/${t.slots} vagas`}</Badge>
              </div>
              <p className="font-semibold">{t.name}</p>
              <p className="font-display text-2xl font-semibold">{fmtMoney(t.price_cents)}</p>
              <ul className="list-disc pl-5 text-sm text-muted-foreground">
                {(t.perks ?? []).map((p) => <li key={p}>{p}</li>)}
              </ul>
              <p className="text-xs text-muted-foreground">Logo no site por {t.visibility_days} dias · destaque {t.weight}</p>
              <Button size="sm" variant="ghost" onClick={() => setEditing(t.id)}><Icon name="pen" className="h-4 w-4" /> Editar</Button>
            </Card>
          ))}
      </div>
    </section>
  )
}

function TierForm({ seasonId, tier, onDone }: { seasonId: string; tier?: Tier; onDone: () => void }) {
  const refresh = useSponsorRefresh(seasonId)
  const [f, setF] = useState(tier ? {
    name: tier.name, tagline: tier.tagline ?? '', price: String(tier.price_cents / 100),
    slots: tier.slots ? String(tier.slots) : '', visibility_days: String(tier.visibility_days),
    perks: (tier.perks ?? []).join('\n'), weight: String(tier.weight),
  } : BLANK)
  const m = useMutation({
    mutationFn: (fn: () => Promise<unknown>) => fn(),
    onSuccess: () => { refresh(); onDone() },
  })
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setF({ ...f, [k]: e.target.value })

  function save(e: React.FormEvent) {
    e.preventDefault()
    const body = {
      name: f.name, tagline: f.tagline || null,
      price_cents: Math.round(Number(f.price.replace(',', '.')) * 100) || 0,
      slots: f.slots ? Number(f.slots) : null, visibility_days: Number(f.visibility_days) || 60,
      perks: f.perks.split('\n').map((p) => p.trim()).filter(Boolean), weight: Number(f.weight),
      sort: tier?.sort ?? 99,
    }
    m.mutate(() => tier
      ? api.admin.patchTier(tier.id, { ...body, unlimited: body.slots === null })
      : api.admin.addTier(seasonId, body))
  }

  return (
    <Card>
      <form onSubmit={save} className="grid gap-3 md:grid-cols-3">
        <Field label="Nome"><Input required minLength={2} value={f.name} onChange={set('name')} /></Field>
        <Field label="Valor (R$)"><Input required inputMode="decimal" value={f.price} onChange={set('price')} /></Field>
        <Field label="Vagas" hint="Vazio = sem limite"><Input type="number" min={1} value={f.slots} onChange={set('slots')} /></Field>
        <Field label="Frase curta"><Input value={f.tagline} onChange={set('tagline')} maxLength={160} /></Field>
        <Field label="Dias com a logo no site"><Input type="number" min={1} max={730} value={f.visibility_days} onChange={set('visibility_days')} /></Field>
        <Field label="Destaque da logo">
          <Select value={f.weight} onChange={set('weight')}>
            <option value="1">1 · sagui (rodapé)</option>
            <option value="2">2 · macaco-prego (médio)</option>
            <option value="3">3 · gorila (principal)</option>
          </Select>
        </Field>
        <div className="md:col-span-3">
          <Field label="Benefícios (um por linha)"><Textarea value={f.perks} onChange={set('perks')} /></Field>
        </div>
        <div className="flex flex-wrap gap-2 md:col-span-3">
          <Button type="submit" size="sm" disabled={m.isPending}>Salvar cota</Button>
          <Button type="button" size="sm" variant="ghost" onClick={onDone}>Cancelar</Button>
          {tier && (
            <Button type="button" size="sm" variant="ghost" className="ml-auto text-destructive" disabled={m.isPending}
              onClick={() => confirm(`Apagar a cota ${tier.name}?`) && m.mutate(() => api.admin.deleteTier(tier.id))}>
              <Icon name="trash" className="h-4 w-4" /> Apagar
            </Button>
          )}
        </div>
        <div className="md:col-span-3"><ErrorBox error={m.isError ? errorMessage(m.error) : null} /></div>
      </form>
    </Card>
  )
}
