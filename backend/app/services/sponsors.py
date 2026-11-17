"""Patrocínio dos torneios: cotas, fichas de patrocinadores e logos."""

from __future__ import annotations

import base64
import re
import secrets
import unicodedata
import uuid
from datetime import date

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Season, Sponsor, SponsorStatus, SponsorTier
from app.schemas import PublicSponsor, TierOut

MAX_LOGO_BYTES = 1_500_000
_SIGS = {b"\x89PNG\r\n\x1a\n": "image/png", b"\xff\xd8\xff": "image/jpeg"}

# Cotas sugeridas ao abrir o patrocínio de um torneio ("escolha seu primata").
# A organização edita nomes, valores e benefícios à vontade.
DEFAULT_TIERS = [
    dict(name="Sagui", weight=1, price_cents=15000, slots=None, visibility_days=60,
         tagline="Pequeno, ligeiro e sempre por perto da quadra.",
         perks=["Logo no site do torneio", "Agradecimento no grupo da liga"]),
    dict(name="Macaco-prego", weight=2, price_cents=30000, slots=6, visibility_days=90,
         tagline="O dono da quadra: rouba a bola e a cena.",
         perks=["Logo em destaque no site", "Logo nos cartões de resultado e de campeão",
                "Agradecimento no grupo da liga"]),
    dict(name="Gorila", weight=3, price_cents=80000, slots=1, visibility_days=180,
         tagline="Só um. Manda em tudo. Nome no torneio.",
         perks=["“Duvis Cup apresentada por” você", "Logo gigante no cartão do campeão",
                "Logo no topo do site por 6 meses"]),
]


class SponsorError(ValueError):
    pass


def slugify(text: str) -> str:
    t = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode().lower()
    t = re.sub(r"[^a-z0-9]+", "-", t).strip("-")
    return (t[:24].strip("-") or "torneio") + "-" + secrets.token_hex(2)


def decode_logo(data_url: str) -> tuple[bytes, str]:
    """Aceita data URL (ou base64 puro) de PNG/JPEG; devolve (bytes, mime)."""
    raw = data_url.split(",", 1)[1] if data_url.startswith("data:") else data_url
    try:
        blob = base64.b64decode(raw, validate=True)
    except (ValueError, TypeError) as exc:
        raise SponsorError("Logo inválida.") from exc
    if len(blob) > MAX_LOGO_BYTES:
        raise SponsorError("Logo muito grande (máx. 1,5 MB).")
    for sig, mime in _SIGS.items():
        if blob.startswith(sig):
            return blob, mime
    raise SponsorError("A logo precisa ser PNG ou JPEG.")


def logo_url(s: Sponsor) -> str | None:
    if not s.logo:
        return None
    v = int((s.approved_at or s.created_at).timestamp())
    return f"/api/v1/public/sponsors/{s.id}/logo?v={v}"


def public_sponsor(s: Sponsor) -> PublicSponsor:
    return PublicSponsor(id=s.id, company=s.company, website=s.website, instagram=s.instagram,
                         tier_name=s.tier.name if s.tier else None,
                         weight=s.tier.weight if s.tier else 1, logo_url=logo_url(s))


async def tiers_out(db: AsyncSession, season_id: uuid.UUID) -> list[TierOut]:
    res = await db.execute(select(SponsorTier).where(SponsorTier.season_id == season_id)
                           .order_by(SponsorTier.sort, SponsorTier.price_cents))
    tiers = list(res.scalars())
    counts = dict((await db.execute(
        select(Sponsor.tier_id, func.count()).where(
            Sponsor.season_id == season_id, Sponsor.status == SponsorStatus.APPROVED)
        .group_by(Sponsor.tier_id))).all())
    out = []
    for t in tiers:
        o = TierOut.model_validate(t)
        o.taken = counts.get(t.id, 0)
        o.available = t.slots is None or o.taken < t.slots
        out.append(o)
    return out


async def ensure_default_tiers(db: AsyncSession, season: Season) -> None:
    exists = await db.scalar(select(func.count()).select_from(SponsorTier)
                             .where(SponsorTier.season_id == season.id))
    if exists:
        return
    for i, d in enumerate(DEFAULT_TIERS):
        db.add(SponsorTier(season_id=season.id, sort=i, **d))
    await db.flush()


async def season_sponsors(db: AsyncSession, season_id: uuid.UUID, *, active_only: bool
                          ) -> list[Sponsor]:
    """Aprovados do torneio, do maior peso para o menor. `active_only` respeita o prazo
    de exibição no site (visible_until); os cartões do torneio mostram todos."""
    q = select(Sponsor).where(Sponsor.season_id == season_id,
                              Sponsor.status == SponsorStatus.APPROVED)
    if active_only:
        q = q.where((Sponsor.visible_until.is_(None)) | (Sponsor.visible_until >= date.today()))
    res = await db.execute(q.order_by(Sponsor.approved_at))
    items = list(res.scalars().unique())
    items.sort(key=lambda s: -(s.tier.weight if s.tier else 1))
    return items


async def active_sponsors(db: AsyncSession) -> list[Sponsor]:
    """Logos que estampam o site agora (de qualquer torneio, dentro do prazo)."""
    q = select(Sponsor).where(
        Sponsor.status == SponsorStatus.APPROVED,
        (Sponsor.visible_until.is_(None)) | (Sponsor.visible_until >= date.today()))
    res = await db.execute(q.order_by(Sponsor.approved_at))
    items = list(res.scalars().unique())
    items.sort(key=lambda s: -(s.tier.weight if s.tier else 1))
    return items
