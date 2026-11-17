"""Patrocínio: página pública 'Patrocine este torneio', logos, cartões de compartilhamento
e o painel da organização (cotas e fichas)."""

import time
import uuid
from collections import defaultdict, deque
from datetime import date, timedelta

from fastapi import APIRouter, HTTPException, Request, Response
from sqlalchemy import func, select

from app.api.deps import DB, Admin, OutboxDep
from app.core.config import settings
from app.domain.phone import PhoneError, normalize_phone
from app.domain.scoring import format_score
from app.models import (
    Category,
    Entry,
    EntryStatus,
    Match,
    MatchStatus,
    Role,
    Season,
    Sponsor,
    SponsorStatus,
    SponsorTier,
    Stage,
    User,
    UserStatus,
    utcnow,
)
from app.schemas import (
    ChampionCard,
    MatchCard,
    PublicSponsor,
    SponsorIn,
    SponsorOut,
    SponsorPage,
    SponsorPageCategory,
    SponsorPatch,
    SponsorshipIn,
    SponsorshipOut,
    SponsorSubmitted,
    TierIn,
    TierOut,
    TierPatch,
)
from app.services import league as L
from app.services import messages as M
from app.services import sponsors as S

public = APIRouter()
admin = APIRouter()

PLAYED = (MatchStatus.REPORTED, MatchStatus.CONFIRMED, MatchStatus.CONTESTED)


def _bad(msg: str) -> HTTPException:
    return HTTPException(400, msg)


# --------------------------------------------------------------- limite simples
_hits: dict[str, deque] = defaultdict(deque)


def _throttle(request: Request, limit: int = 5, window: int = 3600) -> None:
    """Fichas públicas: no máximo `limit` por IP por hora (evita spam no WhatsApp)."""
    ip = (request.headers.get("x-forwarded-for") or "").split(",")[0].strip() or (
        request.client.host if request.client else "?")
    now = time.monotonic()
    q = _hits[ip]
    while q and now - q[0] > window:
        q.popleft()
    if len(q) >= limit:
        raise HTTPException(429, "Muitas fichas seguidas. Tenta de novo mais tarde.")
    q.append(now)


# ----------------------------------------------------------------------- público
async def _season_by_slug(db, slug: str) -> Season:
    season = await db.scalar(select(Season).where(Season.sponsor_slug == slug))
    if not season:
        raise HTTPException(404, "Esse torneio não está procurando patrocínio (ou o link mudou).")
    return season


@public.get("/sponsor/{slug}", response_model=SponsorPage)
async def sponsor_page(slug: str, db: DB):
    season = await _season_by_slug(db, slug)
    cats = list((await db.execute(select(Category).where(Category.season_id == season.id)
                                  .order_by(Category.created_at))).scalars())
    out_cats, players = [], set()
    for c in cats:
        entries = await L.get_entries(db, c)
        active = [e for e in entries if e.status != EntryStatus.WITHDRAWN]
        players.update(e.user_id for e in active)
        champ = next((e.user.display_name for e in entries if e.id == c.champion_entry_id), None)
        out_cats.append(SponsorPageCategory(name=c.name, phase=c.phase, players=len(active),
                                            start_date=c.start_date, final_date=c.final_date,
                                            champion=champ))
    played = await db.scalar(select(func.count()).select_from(Match).join(Category).where(
        Category.season_id == season.id, Match.status.in_(PLAYED))) or 0
    if not players:  # temporada sem inscrições ainda: conta a turma aprovada
        players = set((await db.execute(select(User.id).where(
            User.status == UserStatus.APPROVED, User.role != Role.ADMIN))).scalars())
    sponsors = await S.season_sponsors(db, season.id, active_only=False)
    return SponsorPage(season_name=season.name, open=season.sponsor_open,
                       pitch=season.sponsor_pitch, players=len(players), matches_played=played,
                       categories=out_cats, tiers=await S.tiers_out(db, season.id),
                       sponsors=[S.public_sponsor(s) for s in sponsors])


@public.post("/sponsor/{slug}", response_model=SponsorSubmitted, status_code=201)
async def sponsor_submit(slug: str, body: SponsorIn, request: Request, db: DB,
                         outbox: OutboxDep):
    season = await _season_by_slug(db, slug)
    if not season.sponsor_open:
        raise _bad("As cotas deste torneio estão fechadas no momento.")
    tier = await db.get(SponsorTier, body.tier_id)
    if not tier or tier.season_id != season.id:
        raise _bad("Escolha uma cota.")
    if not next(t for t in await S.tiers_out(db, season.id) if t.id == tier.id).available:
        raise _bad("Essa cota já esgotou. Escolha outra.")
    try:
        phone = normalize_phone(body.phone)
    except PhoneError as exc:
        raise _bad(str(exc))
    sp = Sponsor(season_id=season.id, tier_id=tier.id, company=body.company.strip(),
                 contact_name=body.contact_name.strip(), phone=phone,
                 email=body.email, website=_clean(body.website),
                 instagram=_insta(body.instagram), message=_clean(body.message))
    if body.logo:
        try:
            sp.logo, sp.logo_mime = S.decode_logo(body.logo)
        except S.SponsorError as exc:
            raise _bad(str(exc))
    _throttle(request)
    db.add(sp)
    await db.flush()
    # avisa a organização em privado (nunca o número digitado no formulário)
    admins = (await db.execute(select(User).where(User.role == Role.ADMIN,
                                                  User.status == UserStatus.APPROVED))).scalars()
    text = M.sponsor_submitted(sp.company, tier.name, sp.contact_name, phone,
                               f"{settings.FRONTEND_URL.rstrip('/')}/admin?aba=patrocinio")
    for a in admins:
        if a.phone:
            outbox.add(text, number=a.phone)
    return SponsorSubmitted(id=sp.id, payment=season.sponsor_payment)


@public.get("/sponsors/active", response_model=list[PublicSponsor])
async def sponsors_active(db: DB):
    return [S.public_sponsor(s) for s in await S.active_sponsors(db)]


@public.get("/sponsors/{sponsor_id}/logo")
async def sponsor_logo(sponsor_id: uuid.UUID, db: DB):
    sp = await db.get(Sponsor, sponsor_id)
    if not sp or not sp.logo:
        raise HTTPException(404, "Sem logo.")
    return Response(sp.logo, media_type=sp.logo_mime or "image/png",
                    headers={"Cache-Control": "public, max-age=86400"})


async def _card_sponsors(db, season_id) -> list[PublicSponsor]:
    return [S.public_sponsor(s) for s in await S.season_sponsors(db, season_id, active_only=False)]


@public.get("/cards/champion/{category_id}", response_model=ChampionCard)
async def champion_card(category_id: uuid.UUID, db: DB):
    cat = await db.get(Category, category_id)
    if not cat or not cat.champion_entry_id:
        raise HTTPException(404, "Ainda não tem campeão.")
    season = await db.get(Season, cat.season_id)
    champ = await db.get(Entry, cat.champion_entry_id)
    final = (await L.get_matches(db, cat, Stage.FINAL) or [None])[0]
    runner, score, sets, stb, rt, played = None, None, [], None, None, None
    if final and final.winner_side:
        loser = final.entry2 if final.winner_side == 1 else final.entry1
        runner = L.name_of(loser) if loser else None
        score = format_score(final.score, final.result_type or "normal") if final.score else None
        sets, stb = _sets(final.score, flip=final.winner_side == 2)
        rt, played = final.result_type, final.played_on
    return ChampionCard(season=season.name, category=cat.name, champion=L.name_of(champ),
                        runner_up=runner, score=score, sets=sets, super_tiebreak=stb,
                        result_type=rt, played_on=played,
                        sponsors=await _card_sponsors(db, season.id))


def _sets(score: dict | None, flip: bool) -> tuple[list[list[int]], list[int] | None]:
    """Sets e super tie-break do placar; `flip` inverte para a visão do outro lado."""
    if not score:
        return [], None
    f = (lambda p: [p[1], p[0]]) if flip else (lambda p: list(p))
    stb = score.get("super_tiebreak")
    return [f(s) for s in score.get("sets") or []], (f(stb) if stb else None)


@public.get("/cards/match/{match_id}", response_model=MatchCard)
async def match_card(match_id: uuid.UUID, db: DB):
    m = await db.get(Match, match_id)
    if not m or m.status not in PLAYED or not (m.entry1 and m.entry2):
        raise HTTPException(404, "Partida sem resultado.")
    cat = await db.get(Category, m.category_id)
    season = await db.get(Season, cat.season_id)
    return MatchCard(season=season.name, category=cat.name, stage=L.stage_label(m),
                     player1=L.name_of(m.entry1), player2=L.name_of(m.entry2),
                     winner_side=m.winner_side,
                     score=format_score(m.score, m.result_type or "normal"),
                     sets=_sets(m.score, False)[0], super_tiebreak=_sets(m.score, False)[1],
                     result_type=m.result_type,
                     played_on=m.played_on, sponsors=await _card_sponsors(db, season.id))


def _clean(v: str | None) -> str | None:
    v = (v or "").strip()
    return v or None


def _insta(v: str | None) -> str | None:
    v = _clean(v)
    return v.lstrip("@").split("/")[-1][:60] if v else None


# ---------------------------------------------------------------- organização
def _sponsor_out(s: Sponsor) -> SponsorOut:
    o = SponsorOut.model_validate(s)
    o.tier_name = s.tier.name if s.tier else None
    o.logo_url = S.logo_url(s)
    return o


async def _sponsorship(db, season: Season) -> SponsorshipOut:
    url = (f"{settings.FRONTEND_URL.rstrip('/')}/patrocine/{season.sponsor_slug}"
           if season.sponsor_slug else None)
    return SponsorshipOut(season_id=season.id, season_name=season.name, open=season.sponsor_open,
                          slug=season.sponsor_slug, url=url, pitch=season.sponsor_pitch,
                          payment=season.sponsor_payment, tiers=await S.tiers_out(db, season.id))


async def _season(db, season_id) -> Season:
    s = await db.get(Season, season_id)
    if not s:
        raise HTTPException(404, "Temporada não encontrada.")
    return s


@admin.get("/seasons/{season_id}/sponsorship", response_model=SponsorshipOut)
async def get_sponsorship(season_id: uuid.UUID, user: Admin, db: DB):
    return await _sponsorship(db, await _season(db, season_id))


@admin.patch("/seasons/{season_id}/sponsorship", response_model=SponsorshipOut)
async def set_sponsorship(season_id: uuid.UUID, body: SponsorshipIn, user: Admin, db: DB):
    season = await _season(db, season_id)
    if body.open is not None:
        season.sponsor_open = body.open
        if body.open:
            if not season.sponsor_slug:
                season.sponsor_slug = S.slugify(season.name)
            await S.ensure_default_tiers(db, season)
    if body.pitch is not None:
        season.sponsor_pitch = _clean(body.pitch)
    if body.payment is not None:
        season.sponsor_payment = _clean(body.payment)
    await L.audit(db, user, "sponsorship", f"Patrocínio de {season.name} atualizado")
    await db.flush()
    return await _sponsorship(db, season)


@admin.post("/seasons/{season_id}/sponsorship/new-link", response_model=SponsorshipOut)
async def new_link(season_id: uuid.UUID, user: Admin, db: DB):
    """Gera outro link (o antigo para de funcionar)."""
    season = await _season(db, season_id)
    season.sponsor_slug = S.slugify(season.name)
    await db.flush()
    return await _sponsorship(db, season)


@admin.post("/seasons/{season_id}/tiers", response_model=TierOut, status_code=201)
async def add_tier(season_id: uuid.UUID, body: TierIn, user: Admin, db: DB):
    await _season(db, season_id)
    t = SponsorTier(season_id=season_id, **body.model_dump())
    db.add(t)
    await db.flush()
    return next(x for x in await S.tiers_out(db, season_id) if x.id == t.id)


async def _tier(db, tier_id) -> SponsorTier:
    t = await db.get(SponsorTier, tier_id)
    if not t:
        raise HTTPException(404, "Cota não encontrada.")
    return t


@admin.patch("/tiers/{tier_id}", response_model=TierOut)
async def patch_tier(tier_id: uuid.UUID, body: TierPatch, user: Admin, db: DB):
    t = await _tier(db, tier_id)
    data = body.model_dump(exclude_unset=True)
    if data.pop("unlimited", None):
        t.slots = None
        data.pop("slots", None)
    for k, v in data.items():
        setattr(t, k, v)
    await db.flush()
    return next(x for x in await S.tiers_out(db, t.season_id) if x.id == t.id)


@admin.delete("/tiers/{tier_id}")
async def delete_tier(tier_id: uuid.UUID, user: Admin, db: DB):
    t = await _tier(db, tier_id)
    used = await db.scalar(select(func.count()).select_from(Sponsor).where(
        Sponsor.tier_id == t.id, Sponsor.status == SponsorStatus.APPROVED))
    if used:
        raise _bad("Essa cota tem patrocinador aprovado; mude a cota dele antes.")
    await db.delete(t)
    return {"ok": True}


@admin.get("/seasons/{season_id}/sponsors", response_model=list[SponsorOut])
async def list_sponsors(season_id: uuid.UUID, user: Admin, db: DB):
    res = await db.execute(select(Sponsor).where(Sponsor.season_id == season_id)
                           .order_by(Sponsor.created_at.desc()))
    return [_sponsor_out(s) for s in res.scalars().unique()]


@admin.post("/seasons/{season_id}/sponsors", response_model=SponsorOut, status_code=201)
async def add_sponsor(season_id: uuid.UUID, body: SponsorIn, user: Admin, db: DB):
    """Cadastro feito pela organização (patrocinador que chegou por fora do link)."""
    await _season(db, season_id)
    tier = await _tier(db, body.tier_id)
    try:
        phone = normalize_phone(body.phone)
    except PhoneError as exc:
        raise _bad(str(exc))
    sp = Sponsor(season_id=season_id, tier_id=tier.id, company=body.company.strip(),
                 contact_name=body.contact_name.strip(), phone=phone, email=body.email,
                 website=_clean(body.website), instagram=_insta(body.instagram),
                 message=_clean(body.message))
    if body.logo:
        try:
            sp.logo, sp.logo_mime = S.decode_logo(body.logo)
        except S.SponsorError as exc:
            raise _bad(str(exc))
    db.add(sp)
    await db.flush()
    await db.refresh(sp, ["tier"])
    return _sponsor_out(sp)


@admin.patch("/sponsors/{sponsor_id}", response_model=SponsorOut)
async def patch_sponsor(sponsor_id: uuid.UUID, body: SponsorPatch, user: Admin, db: DB,
                        outbox: OutboxDep):
    sp = await db.get(Sponsor, sponsor_id)
    if not sp:
        raise HTTPException(404, "Patrocinador não encontrado.")
    data = body.model_dump(exclude_unset=True)
    if "tier_id" in data and data["tier_id"]:
        await _tier(db, data["tier_id"])
        sp.tier_id = data["tier_id"]
        await db.flush()
        await db.refresh(sp, ["tier"])
    if body.logo:
        try:
            sp.logo, sp.logo_mime = S.decode_logo(body.logo)
        except S.SponsorError as exc:
            raise _bad(str(exc))
    for k in ("company", "website", "instagram"):
        if k in data:
            setattr(sp, k, _insta(data[k]) if k == "instagram" else _clean(data[k]))
    if "visible_until" in data:
        sp.visible_until = data["visible_until"]
    if body.status and body.status != sp.status:
        if body.status not in (SponsorStatus.APPROVED, SponsorStatus.REJECTED,
                               SponsorStatus.PENDING):
            raise _bad("Status inválido.")
        if body.status == SponsorStatus.APPROVED:
            if not sp.logo:
                raise _bad("Sem logo ainda: envie a logo antes de aprovar.")
            sp.approved_at = utcnow()
            if not sp.visible_until:
                days = sp.tier.visibility_days if sp.tier else 60
                sp.visible_until = date.today() + timedelta(days=days)
            season = await db.get(Season, sp.season_id)
            outbox.add(M.sponsor_approved(sp.company, season.name))
        sp.status = body.status
        await L.audit(db, user, "sponsor", f"{sp.company}: {body.status}")
    await db.flush()
    return _sponsor_out(sp)


@admin.delete("/sponsors/{sponsor_id}")
async def delete_sponsor(sponsor_id: uuid.UUID, user: Admin, db: DB):
    sp = await db.get(Sponsor, sponsor_id)
    if not sp:
        raise HTTPException(404, "Patrocinador não encontrado.")
    await L.audit(db, user, "sponsor_delete", f"{sp.company} removido")
    await db.delete(sp)
    return {"ok": True}
