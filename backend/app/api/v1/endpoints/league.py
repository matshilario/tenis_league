"""Endpoints dos membros: temporada, classificação, partidas e lançamento de placar."""

import uuid

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.orm import selectinload

from app.api.deps import DB, Member, OutboxDep
from app.api.serializers import match_out
from app.domain import draw as D
from app.models import Category, Entry, Match, Season, User, UserStatus
from app.schemas import (
    CategoryBrief,
    CategoryDetail,
    ContestIn,
    EntryOut,
    GroupOut,
    MatchOut,
    PublicUser,
    ReportIn,
    SeasonOut,
    StandingOut,
)
from app.services import league as L

router = APIRouter()


def _err(exc: Exception) -> HTTPException:
    return HTTPException(status.HTTP_400_BAD_REQUEST, str(exc))


@router.get("/seasons", response_model=list[SeasonOut])
async def list_seasons(user: Member, db: DB):
    res = await db.execute(select(Season).options(selectinload(Season.categories))
                           .order_by(Season.is_current.desc(), Season.created_at.desc()))
    return list(res.scalars())


@router.get("/members", response_model=list[PublicUser])
async def list_members(user: Member, db: DB):
    res = await db.execute(select(User).where(User.status == UserStatus.APPROVED)
                           .order_by(User.name))
    return list(res.scalars())


async def build_detail(db, cat: Category, outbox=None) -> CategoryDetail:
    await L.settle_overdue(db, outbox)
    season = await db.get(Season, cat.season_id)
    entries = await L.get_entries(db, cat)
    table = await L.standings(db, cat)
    q = D.qualifiers_per_group(cat.n_groups or 1)
    groups = []
    for g, rows in table.items():
        out_rows = []
        for sr in rows:
            s = sr.row.stats
            out_rows.append(StandingOut(
                position=sr.row.position, entry_id=sr.entry.id,
                player=PublicUser.model_validate(sr.entry.user),
                entry_status=sr.entry.status, eligible_finals=sr.entry.eligible_finals,
                played=s.played, wins=s.wins, losses=s.losses, sets_won=s.sets_won,
                sets_lost=s.sets_lost, games_won=s.games_won, games_lost=s.games_lost,
                wo_losses=s.wo_losses, points=s.points, form=s.form[-5:],
                decided_by=sr.row.decided_by, needs_lottery=sr.row.needs_lottery,
                qualifies=sr.row.position <= q,
            ))
        groups.append(GroupOut(name=g, rows=out_rows))
    matches = await L.get_matches(db, cat)
    champion = None
    if cat.champion_entry_id:
        ce = next((e for e in entries if e.id == cat.champion_entry_id), None)
        champion = PublicUser.model_validate(ce.user) if ce else None
    return CategoryDetail(
        category=CategoryBrief.model_validate(cat),
        season={"id": str(season.id), "name": season.name, "announcement": season.announcement},
        entries=[EntryOut.model_validate(e) for e in entries],
        groups=groups,
        matches=[match_out(m) for m in matches],
        champion=champion,
    )


@router.get("/categories/{category_id}", response_model=CategoryDetail)
async def category_detail(category_id: uuid.UUID, user: Member, db: DB, outbox: OutboxDep):
    cat = await db.get(Category, category_id)
    if not cat:
        raise HTTPException(404, "Categoria não encontrada.")
    return await build_detail(db, cat, outbox)


@router.get("/matches/mine", response_model=list[MatchOut])
async def my_matches(user: Member, db: DB, outbox: OutboxDep):
    await L.settle_overdue(db, outbox)
    entry_ids = select(Entry.id).where(Entry.user_id == user.id)
    res = await db.execute(select(Match).where(
        or_(Match.entry1_id.in_(entry_ids), Match.entry2_id.in_(entry_ids)))
        .order_by(Match.deadline.is_(None), Match.deadline, Match.round))
    return [match_out(m) for m in res.scalars().unique()]


async def _match(db, match_id: uuid.UUID) -> Match:
    m = await db.get(Match, match_id)
    if not m:
        raise HTTPException(404, "Partida não encontrada.")
    return m


@router.post("/matches/{match_id}/report", response_model=MatchOut)
async def report(match_id: uuid.UUID, body: ReportIn, user: Member, db: DB, outbox: OutboxDep):
    m = await _match(db, match_id)
    try:
        await L.report_result(db, m, user, body.result_type, body.score, body.winner_side,
                              body.played_on, outbox)
    except L.LeagueError as exc:
        raise _err(exc)
    return match_out(m)


@router.post("/matches/{match_id}/confirm", response_model=MatchOut)
async def confirm(match_id: uuid.UUID, user: Member, db: DB, outbox: OutboxDep):
    m = await _match(db, match_id)
    try:
        await L.confirm_result(db, m, user, outbox)
    except L.LeagueError as exc:
        raise _err(exc)
    return match_out(m)


@router.post("/matches/{match_id}/contest", response_model=MatchOut)
async def contest(match_id: uuid.UUID, body: ContestIn, user: Member, db: DB,
                  outbox: OutboxDep):
    m = await _match(db, match_id)
    try:
        await L.contest_result(db, m, user, body.reason, outbox)
    except L.LeagueError as exc:
        raise _err(exc)
    return match_out(m)
