"""Regras da liga que dependem do banco (sorteio, resultados, retiradas, chave)."""

from __future__ import annotations

import random
import uuid
from dataclasses import dataclass
from datetime import date, timedelta

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.domain import draw as D
from app.domain.scoring import ResultType, ScoreError, resolve_result
from app.domain.standings import EntryIn, MatchIn, Row, compute_standings
from app.models import (
    VALID_FOR_STANDINGS,
    AuditLog,
    Category,
    Entry,
    EntryStatus,
    Match,
    MatchStatus,
    Phase,
    Stage,
    User,
    aware,
    utcnow,
)
from app.services import messages as M
from app.services.notify import Outbox


class LeagueError(ValueError):
    """Operação recusada por regra da liga; a mensagem vai para o usuário."""


STAGE_LABEL = {Stage.GROUP: "fase classificatória", Stage.SEMIFINAL: "semifinal",
               Stage.FINAL: "final"}
PENDING = {MatchStatus.SCHEDULED, MatchStatus.INTERRUPTED}


# ------------------------------------------------------------------ utilitários
async def audit(db: AsyncSession, actor: User | None, action: str, summary: str,
                details: dict | None = None) -> None:
    db.add(AuditLog(actor_id=actor.id if actor else None, action=action, summary=summary,
                    details=details))


def name_of(entry: Entry | None) -> str:
    return entry.user.display_name if entry else "folga"


async def get_entries(db: AsyncSession, cat: Category) -> list[Entry]:
    res = await db.execute(select(Entry).where(Entry.category_id == cat.id)
                           .order_by(Entry.seed.is_(None), Entry.seed, Entry.created_at))
    return list(res.scalars().unique())


async def get_matches(db: AsyncSession, cat: Category, stage: str | None = None
                      ) -> list[Match]:
    q = select(Match).where(Match.category_id == cat.id)
    if stage:
        q = q.where(Match.stage == stage)
    q = q.order_by(Match.stage, Match.round, Match.group_name, Match.slot)
    res = await db.execute(q)
    return list(res.scalars().unique())


def stage_label(m: Match) -> str:
    if m.stage == Stage.GROUP:
        return f"rodada {m.round}" + (f" — grupo {m.group_name}" if m.group_name else "")
    return STAGE_LABEL[m.stage]


# --------------------------------------------------------------- confirmação 48h
async def settle_overdue(db: AsyncSession, outbox: Outbox | None = None) -> int:
    """Resultados informados há mais de 48h sem contestação passam a confirmados."""
    limit = utcnow() - timedelta(hours=settings.CONTEST_WINDOW_HOURS)
    res = await db.execute(select(Match).where(Match.status == MatchStatus.REPORTED,
                                               Match.reported_at <= limit))
    changed = list(res.scalars().unique())
    for m in changed:
        m.status = MatchStatus.CONFIRMED
        m.confirmed_at = utcnow()
    if changed:
        await db.flush()
        for cat_id in {m.category_id for m in changed}:
            cat = await db.get(Category, cat_id)
            if cat:
                await propagate_knockout(db, cat, outbox)
    return len(changed)


# --------------------------------------------------------------- classificação
@dataclass
class StandingRow:
    row: Row
    entry: Entry


async def standings(db: AsyncSession, cat: Category) -> dict[str, list[StandingRow]]:
    entries = [e for e in await get_entries(db, cat)
               if e.group_name and e.status != EntryStatus.WAITLIST]
    matches = [m for m in await get_matches(db, cat, Stage.GROUP)
               if m.status in VALID_FOR_STANDINGS]
    by_id = {e.id: e for e in entries}
    out: dict[str, list[StandingRow]] = {}
    for g in sorted({e.group_name for e in entries}):
        g_entries = [e for e in entries if e.group_name == g]
        rows = compute_standings(
            [EntryIn(e.id, e.seed, e.lottery_rank) for e in g_entries],
            [MatchIn(m.entry1_id, m.entry2_id, m.result_type or "normal", m.score,
                     m.winner_side) for m in matches if m.group_name == g],
        )
        out[g] = [StandingRow(r, by_id[r.entry_id]) for r in rows]
    return out


# -------------------------------------------------------------------- inscrições
async def add_entry(db: AsyncSession, cat: Category, user: User) -> Entry:
    if cat.phase != Phase.REGISTRATION:
        raise LeagueError("Inscrições encerradas: a temporada desta categoria já começou.")
    entries = await get_entries(db, cat)
    if any(e.user_id == user.id for e in entries):
        raise LeagueError(f"{user.display_name} já está inscrito nesta categoria.")
    active = [e for e in entries if e.status == EntryStatus.ACTIVE]
    seeds = [e.seed for e in entries if e.seed is not None]
    status = EntryStatus.ACTIVE if len(active) < D.MAX_PER_CATEGORY else EntryStatus.WAITLIST
    e = Entry(category_id=cat.id, user_id=user.id, status=status,
              seed=(max(seeds) + 1) if seeds else 1)
    db.add(e)
    await db.flush()
    await db.refresh(e, ["user"])
    return e


# ------------------------------------------------------------------------ sorteio
async def generate_draw(db: AsyncSession, cat: Category, start: date, actor: User,
                        outbox: Outbox) -> list[Match]:
    if cat.phase != Phase.REGISTRATION:
        raise LeagueError("O sorteio já foi feito para esta categoria.")
    entries = [e for e in await get_entries(db, cat) if e.status == EntryStatus.ACTIVE]
    try:
        groups = D.serpentine_groups([e.id for e in entries])  # já em ordem de seed
    except D.DrawError as exc:
        raise LeagueError(str(exc)) from exc

    by_id = {e.id: e for e in entries}
    created: list[Match] = []
    n_rounds = 0
    for g, ids in groups.items():
        for e_id in ids:
            by_id[e_id].group_name = g
        rounds = D.round_robin(ids)
        n_rounds = max(n_rounds, len(rounds))
        for r, pairs in enumerate(rounds, 1):
            for a, b in pairs:
                created.append(Match(
                    category_id=cat.id, stage=Stage.GROUP, group_name=g, round=r,
                    deadline=start + timedelta(days=7 * r - 1),
                    entry1_id=a, entry2_id=b,
                ))
    db.add_all(created)
    cat.n_groups = len(groups)
    cat.start_date = start
    cat.makeup_deadline = start + timedelta(days=7 * (n_rounds + 1) - 1)
    cat.phase = Phase.GROUP_STAGE
    await audit(db, actor, "draw", f"Sorteio da categoria {cat.name}: {len(groups)} grupo(s), "
                f"{len(created)} partidas.")
    outbox.add(M.draw_published(cat.name, n_rounds, start.strftime("%d/%m")))
    await db.flush()
    return created


async def reset_draw(db: AsyncSession, cat: Category, actor: User) -> None:
    matches = await get_matches(db, cat)
    if any(m.status not in (MatchStatus.SCHEDULED, MatchStatus.ANNULLED) for m in matches):
        raise LeagueError("Já existem resultados; não é possível desfazer o sorteio.")
    for m in matches:
        await db.delete(m)
    for e in await get_entries(db, cat):
        e.group_name = None
    cat.phase = Phase.REGISTRATION
    cat.n_groups = cat.start_date = cat.makeup_deadline = None
    cat.homologated_at = None
    await audit(db, actor, "draw_reset", f"Sorteio da categoria {cat.name} desfeito.")
    await db.flush()


# -------------------------------------------------------------------- resultados
def side_of(m: Match, user: User) -> int | None:
    if m.entry1 and m.entry1.user_id == user.id:
        return 1
    if m.entry2 and m.entry2.user_id == user.id:
        return 2
    return None


def _apply_result(m: Match, result_type: str, score: dict | None, winner_side: int | None
                  ) -> None:
    try:
        rt = ResultType(result_type)
    except ValueError as exc:
        raise LeagueError("Tipo de resultado inválido.") from exc
    if m.stage != Stage.GROUP and rt == ResultType.DOUBLE_WALKOVER:
        raise LeagueError("W.O. duplo só existe na fase classificatória.")
    try:
        final, side = resolve_result(rt.value, score, winner_side)
    except ScoreError as exc:
        raise LeagueError(str(exc)) from exc
    m.result_type, m.score, m.winner_side = rt.value, final, side


async def report_result(db: AsyncSession, m: Match, user: User, result_type: str,
                        score: dict | None, winner_side: int | None, played_on: date | None,
                        outbox: Outbox) -> Match:
    """Jogador informa o placar (§10). Abre o prazo de contestação."""
    if side_of(m, user) is None:
        raise LeagueError("Só os jogadores da partida podem informar o placar.")
    if m.status not in PENDING:
        raise LeagueError("Esta partida já tem resultado; fale com a organização para corrigir.")
    if not (m.entry1_id and m.entry2_id):
        raise LeagueError("Confronto ainda não definido.")
    if result_type not in (ResultType.NORMAL.value, ResultType.RETIRED.value):
        raise LeagueError("W.O. é declarado pela organização.")
    _apply_result(m, result_type, score, winner_side)
    m.status = MatchStatus.REPORTED
    m.reported_by_id = user.id
    m.reported_at = utcnow()
    m.played_on = played_on or date.today()
    m.contest_reason = m.contested_by_id = None
    await db.flush()
    outbox.add(M.result_reported(name_of(m.entry1), name_of(m.entry2),
                                 name_of(m.entry1 if m.winner_side == 1 else m.entry2),
                                 m.score, m.result_type, stage_label(m),
                                 settings.CONTEST_WINDOW_HOURS))
    await after_result(db, m, None, outbox)
    return m


def _check_opponent(m: Match, user: User) -> None:
    if m.status != MatchStatus.REPORTED:
        raise LeagueError("Não há resultado aguardando confirmação.")
    side = side_of(m, user)
    if side is None:
        raise LeagueError("Só o adversário pode confirmar ou contestar.")
    if m.reported_by_id == user.id:
        raise LeagueError("Quem informou o placar não pode confirmar/contestar o próprio lançamento.")


async def confirm_result(db: AsyncSession, m: Match, user: User, outbox: Outbox) -> Match:
    _check_opponent(m, user)
    m.status = MatchStatus.CONFIRMED
    m.confirmed_at = utcnow()
    await db.flush()
    await after_result(db, m, None, outbox)
    return m


async def contest_result(db: AsyncSession, m: Match, user: User, reason: str,
                         outbox: Outbox) -> Match:
    _check_opponent(m, user)
    if m.reported_at and utcnow() - aware(m.reported_at) > timedelta(
            hours=settings.CONTEST_WINDOW_HOURS):
        raise LeagueError("O prazo de contestação (48h) já passou.")
    if not reason.strip():
        raise LeagueError("Explique o motivo da contestação.")
    m.status = MatchStatus.CONTESTED
    m.contested_by_id = user.id
    m.contest_reason = reason.strip()
    await db.flush()
    outbox.add(M.result_contested(name_of(m.entry1), name_of(m.entry2), user.display_name,
                                  m.contest_reason))
    await propagate_knockout(db, await db.get(Category, m.category_id), outbox)
    return m


async def admin_set_match(db: AsyncSession, m: Match, actor: User, *, status: str,
                          result_type: str | None, score: dict | None,
                          winner_side: int | None, played_on: date | None, note: str | None,
                          outbox: Outbox) -> Match:
    """Organização edita qualquer partida: resultado, W.O., interrupção, anulação, reset."""
    p1, p2 = name_of(m.entry1), name_of(m.entry2)
    before = {"status": m.status, "result_type": m.result_type, "score": m.score,
              "winner_side": m.winner_side}
    if status == MatchStatus.CONFIRMED:
        if not (m.entry1_id and m.entry2_id):
            raise LeagueError("Confronto ainda não definido.")
        _apply_result(m, result_type or "normal", score, winner_side)
        m.status = MatchStatus.CONFIRMED
        m.confirmed_at = utcnow()
        m.played_on = played_on or m.played_on or date.today()
        outbox.add(M.result_admin(p1, p2, m.score, m.result_type,
                                  name_of(m.entry1 if m.winner_side == 1 else m.entry2)
                                  if m.winner_side else None))
    elif status == MatchStatus.INTERRUPTED:
        m.status = MatchStatus.INTERRUPTED
        m.result_type = m.winner_side = None
        m.score = score  # placar parcial, só registro
        outbox.add(M.match_interrupted(p1, p2, note))
    elif status == MatchStatus.ANNULLED:
        m.status = MatchStatus.ANNULLED
        outbox.add(M.match_annulled(p1, p2))
    elif status == MatchStatus.SCHEDULED:
        m.status = MatchStatus.SCHEDULED
        m.result_type = m.score = m.winner_side = None
        m.reported_at = m.reported_by_id = m.confirmed_at = None
        m.contest_reason = m.contested_by_id = None
    else:
        raise LeagueError("Status inválido.")
    if note is not None:
        m.note = note or None
    await audit(db, actor, "match_edit", f"{p1} × {p2}: {before['status']} → {m.status}",
                {"match_id": str(m.id), "before": before,
                 "after": {"status": m.status, "result_type": m.result_type, "score": m.score,
                           "winner_side": m.winner_side}})
    await db.flush()
    await after_result(db, m, actor, outbox)
    return m


async def after_result(db: AsyncSession, m: Match, actor: User | None, outbox: Outbox) -> None:
    cat = await db.get(Category, m.category_id)
    if m.stage == Stage.GROUP:
        # §9: duas derrotas por W.O. retiram o jogador da fase classificatória
        for e in (m.entry1, m.entry2):
            if e and e.status == EntryStatus.ACTIVE and await wo_losses(db, e) >= 2:
                await withdraw_entry(db, e, actor, "Duas derrotas por W.O. (§9)", False, outbox)
    else:
        await propagate_knockout(db, cat, outbox)


async def wo_losses(db: AsyncSession, e: Entry) -> int:
    res = await db.execute(select(Match).where(
        Match.stage == Stage.GROUP, Match.status.in_(VALID_FOR_STANDINGS),
        or_(Match.entry1_id == e.id, Match.entry2_id == e.id)))
    n = 0
    for m in res.scalars().unique():
        if m.result_type == ResultType.DOUBLE_WALKOVER.value:
            n += 1
        elif m.result_type == ResultType.WALKOVER.value:
            loser = m.entry2_id if m.winner_side == 1 else m.entry1_id
            n += loser == e.id
    return n


# -------------------------------------------------------------- retirada / §9 §10
async def withdraw_entry(db: AsyncSession, e: Entry, actor: User | None, reason: str | None,
                         exclude: bool, outbox: Outbox) -> dict:
    if e.status in (EntryStatus.WITHDRAWN, EntryStatus.EXCLUDED):
        raise LeagueError("Este participante já foi retirado.")
    cat = await db.get(Category, e.category_id)
    res = await db.execute(select(Match).where(
        Match.stage == Stage.GROUP, or_(Match.entry1_id == e.id, Match.entry2_id == e.id)))
    group_matches = list(res.scalars().unique())
    live = [m for m in group_matches if m.status != MatchStatus.ANNULLED]
    kept = bool(live) and not any(m.status in PENDING for m in live)

    if e.status == EntryStatus.WAITLIST or cat.phase == Phase.REGISTRATION:
        kept = False
    elif kept:
        e.eligible_finals = False  # concluiu todos os jogos: mantém resultados (§9)
    else:
        for m in live:
            m.status = MatchStatus.ANNULLED
            m.note = f"Anulada: retirada de {name_of(e)}"
    e.status = EntryStatus.EXCLUDED if exclude else EntryStatus.WITHDRAWN
    e.eligible_finals = False
    e.status_reason = reason
    e.status_changed_at = utcnow()
    await audit(db, actor, "withdraw", f"{name_of(e)} {'excluído' if exclude else 'retirado'}"
                f" ({'resultados mantidos' if kept else 'jogos anulados'})",
                {"entry_id": str(e.id), "reason": reason})
    if cat.phase != Phase.REGISTRATION:
        outbox.add(M.withdrawn(name_of(e), kept, exclude, reason))
    await db.flush()
    return {"kept_results": kept, "annulled": 0 if kept else len(live)}


async def substitute_entry(db: AsyncSession, e: Entry, new_user: User, actor: User) -> Entry:
    """§9: substituir inscrito que ainda não jogou, antes do fim da primeira rodada."""
    cat = await db.get(Category, e.category_id)
    if cat.phase not in (Phase.REGISTRATION, Phase.GROUP_STAGE):
        raise LeagueError("Substituição só é possível até a primeira rodada.")
    if cat.start_date and date.today() > cat.start_date + timedelta(days=6):
        raise LeagueError("A primeira rodada já terminou; não são admitidos novos participantes.")
    res = await db.execute(select(Match).where(
        or_(Match.entry1_id == e.id, Match.entry2_id == e.id),
        Match.status.notin_([MatchStatus.SCHEDULED, MatchStatus.ANNULLED])))
    if res.scalars().first():
        raise LeagueError("Este inscrito já disputou partida; não pode ser substituído.")
    dup = await db.execute(select(Entry).where(Entry.category_id == cat.id,
                                               Entry.user_id == new_user.id))
    if dup.scalars().first():
        raise LeagueError(f"{new_user.display_name} já está inscrito nesta categoria.")
    old = name_of(e)
    e.user_id = new_user.id
    await db.flush()
    await db.refresh(e, ["user"])
    await audit(db, actor, "substitute", f"{old} substituído por {new_user.display_name}")
    return e


async def run_lottery(db: AsyncSession, cat: Category, actor: User) -> list[str]:
    """§6, critério 6: sorteio entre os empates que restaram."""
    table = await standings(db, cat)
    drawn: list[str] = []
    for rows in table.values():
        tied = [sr for sr in rows if sr.row.needs_lottery]
        seen: set = set()
        for sr in tied:
            if sr.entry.id in seen:
                continue
            group = [sr.entry.id, *sr.row.tied_with]
            seen.update(group)
            order = list(group)
            random.shuffle(order)
            ents = {x.entry.id: x.entry for x in rows}
            for i, eid in enumerate(order, 1):
                ents[eid].lottery_rank = i
            drawn.append(" > ".join(name_of(ents[x]) for x in order))
    if drawn:
        await audit(db, actor, "lottery", "Sorteio de desempate: " + "; ".join(drawn))
    await db.flush()
    return drawn


# -------------------------------------------------------------- homologação/chave
async def homologate(db: AsyncSession, cat: Category, actor: User, outbox: Outbox) -> None:
    if cat.phase != Phase.GROUP_STAGE:
        raise LeagueError("A categoria não está na fase classificatória.")
    await settle_overdue(db, outbox)
    problems = []
    for m in await get_matches(db, cat, Stage.GROUP):
        label = f"{name_of(m.entry1)} × {name_of(m.entry2)}"
        if m.status in PENDING:
            problems.append(f"{label}: sem resultado")
        elif m.status == MatchStatus.CONTESTED:
            problems.append(f"{label}: contestada")
        elif m.status == MatchStatus.REPORTED:
            problems.append(f"{label}: dentro do prazo de contestação")
    if problems:
        raise LeagueError("Ainda há pendências:\n" + "\n".join(problems))
    table = await standings(db, cat)
    if any(sr.row.needs_lottery for rows in table.values() for sr in rows):
        raise LeagueError("Há empates que dependem de sorteio. Faça o sorteio antes.")
    cat.homologated_at = utcnow()
    await audit(db, actor, "homologate", f"Classificação de {cat.name} homologada.")
    outbox.add(M.homologated(cat.name))
    await db.flush()


async def generate_semis(db: AsyncSession, cat: Category, actor: User, outbox: Outbox
                         ) -> list[Match]:
    if not cat.homologated_at:
        raise LeagueError("Homologue a classificação antes de montar as semifinais.")
    existing = await get_matches(db, cat)
    semis = sorted([m for m in existing if m.stage == Stage.SEMIFINAL], key=lambda m: m.slot)
    final = next((m for m in existing if m.stage == Stage.FINAL), None)
    if any(m.status in (MatchStatus.REPORTED, MatchStatus.CONFIRMED, MatchStatus.CONTESTED,
                        MatchStatus.INTERRUPTED) for m in semis):
        raise LeagueError("A primeira semifinal já começou; não há mais substituição (§7).")

    table = await standings(db, cat)
    ranking = {g: [sr.entry.id for sr in rows] for g, rows in table.items()}
    eligible = {sr.entry.id for rows in table.values() for sr in rows
                if sr.entry.status == EntryStatus.ACTIVE and sr.entry.eligible_finals}
    pairs = D.fill_semifinals(cat.n_groups or 1, ranking, eligible)

    if not semis:
        semis = [Match(category_id=cat.id, stage=Stage.SEMIFINAL, slot=i,
                       deadline=cat.semis_date) for i in (1, 2)]
        db.add_all(semis)
    if not final:
        final = Match(category_id=cat.id, stage=Stage.FINAL, slot=1, deadline=cat.final_date)
        db.add(final)
    for m, (a, b) in zip(semis, pairs):
        m.entry1_id, m.entry2_id = a, b
        m.status, m.result_type, m.score, m.winner_side = MatchStatus.SCHEDULED, None, None, None
    final.entry1_id = final.entry2_id = None
    final.status, final.result_type, final.score, final.winner_side = (
        MatchStatus.SCHEDULED, None, None, None)
    cat.phase = Phase.KNOCKOUT
    cat.champion_entry_id = None
    await db.flush()
    for m in semis:
        await db.refresh(m, ["entry1", "entry2"])
    await audit(db, actor, "semis", f"Semifinais de {cat.name} definidas.")
    outbox.add(M.semis_defined(cat.name, [f"{name_of(m.entry1)} × {name_of(m.entry2)}"
                                          for m in semis]))
    await propagate_knockout(db, cat, outbox)
    return semis


async def propagate_knockout(db: AsyncSession, cat: Category, outbox: Outbox | None) -> None:
    ko = await get_matches(db, cat)
    semis = sorted([m for m in ko if m.stage == Stage.SEMIFINAL], key=lambda m: m.slot)
    final = next((m for m in ko if m.stage == Stage.FINAL), None)
    if not semis or not final:
        return

    def resolve_bye(m: Match) -> None:
        if m.status in (MatchStatus.SCHEDULED, MatchStatus.BYE):
            if m.entry1_id and not m.entry2_id:
                m.status, m.winner_side = MatchStatus.BYE, 1
            elif m.entry2_id and not m.entry1_id:
                m.status, m.winner_side = MatchStatus.BYE, 2
            elif not m.entry1_id and not m.entry2_id:
                m.status, m.winner_side = MatchStatus.BYE, None
            elif m.status == MatchStatus.BYE:
                m.status, m.winner_side = MatchStatus.SCHEDULED, None

    for s in semis:
        resolve_bye(s)
    winners = []
    for s in semis:
        done = s.status in (MatchStatus.CONFIRMED, MatchStatus.REPORTED, MatchStatus.BYE)
        winners.append(s.winner_entry_id if done else None)

    old = (final.entry1_id, final.entry2_id)
    final.entry1_id, final.entry2_id = winners
    if old != (final.entry1_id, final.entry2_id):
        if final.status not in (MatchStatus.SCHEDULED, MatchStatus.BYE):
            final.status = MatchStatus.SCHEDULED
            final.result_type = final.score = final.winner_side = None
            final.reported_at = final.reported_by_id = final.confirmed_at = None
        semis_done = all(s.status in (MatchStatus.CONFIRMED, MatchStatus.REPORTED,
                                      MatchStatus.BYE) for s in semis)
        await db.flush()
        await db.refresh(final, ["entry1", "entry2"])
        if semis_done and final.entry1_id and final.entry2_id and outbox:
            outbox.add(M.final_defined(cat.name, name_of(final.entry1), name_of(final.entry2)))
    semis_done = all(s.status in (MatchStatus.CONFIRMED, MatchStatus.REPORTED, MatchStatus.BYE)
                     for s in semis)
    if semis_done:
        resolve_bye(final)

    champ = final.winner_entry_id if final.status in (MatchStatus.CONFIRMED,
                                                      MatchStatus.BYE) else None
    if champ != cat.champion_entry_id:
        cat.champion_entry_id = champ
        cat.phase = Phase.FINISHED if champ else Phase.KNOCKOUT
        if champ and outbox:
            from app.services.sponsors import season_sponsors  # evita import circular
            e = await db.get(Entry, champ)
            sps = [s.company for s in await season_sponsors(db, cat.season_id, active_only=False)]
            card = f"{settings.FRONTEND_URL.rstrip('/')}/compartilhar/campeao/{cat.id}"
            outbox.add(M.champion(cat.name, name_of(e), sps, card))
    await db.flush()


async def get_or_404(db: AsyncSession, model, obj_id: uuid.UUID):
    obj = await db.get(model, obj_id)
    if obj is None:
        raise LookupError(f"{model.__name__} não encontrado")
    return obj
