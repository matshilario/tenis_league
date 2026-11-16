"""Painel da organização: convites, aprovações, temporada, sorteio, resultados, retiradas."""

import secrets
import uuid
from datetime import timedelta

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import delete, or_, select

from app.api.deps import DB, Admin, OutboxDep
from app.api.serializers import match_out
from app.api.v1.endpoints.auth import invite_problem
from app.api.v1.endpoints.league import build_detail
from app.core.config import settings
from app.models import (
    AuditLog,
    Category,
    Entry,
    EntryStatus,
    Invite,
    Match,
    MatchStatus,
    Phase,
    Role,
    Season,
    User,
    UserStatus,
    utcnow,
)
from app.schemas import (
    AdminMatchIn,
    AdminUserIn,
    ApproveIn,
    AuditOut,
    CategoryBrief,
    CategoryDetail,
    CategoryIn,
    CategoryPatch,
    DeadlineIn,
    DrawIn,
    EntryAddIn,
    EntryOut,
    EntryPatch,
    InviteIn,
    InviteOut,
    MatchOut,
    SeasonIn,
    SeasonOut,
    SeasonPatch,
    SeedOrderIn,
    SubstituteIn,
    UserOut,
    WithdrawIn,
)
from app.services import league as L
from app.services import messages as M
from app.services import notify as N

router = APIRouter()


def bad(msg: str) -> HTTPException:
    return HTTPException(status.HTTP_400_BAD_REQUEST, msg)


async def _get(db, model, obj_id, label: str):
    obj = await db.get(model, obj_id)
    if not obj:
        raise HTTPException(404, f"{label} não encontrado(a).")
    return obj


# ----------------------------------------------------------------------- convites
def _invite_out(inv: Invite) -> InviteOut:
    out = InviteOut.model_validate(inv)
    out.url = f"{settings.FRONTEND_URL.rstrip('/')}/convite/{inv.token}"
    out.valid = invite_problem(inv) is None
    return out


@router.get("/invites", response_model=list[InviteOut])
async def list_invites(admin: Admin, db: DB):
    res = await db.execute(select(Invite).order_by(Invite.created_at.desc()))
    return [_invite_out(i) for i in res.scalars()]


@router.post("/invites", response_model=InviteOut, status_code=201)
async def create_invite(body: InviteIn, admin: Admin, db: DB):
    inv = Invite(token=secrets.token_urlsafe(16), note=body.note, max_uses=body.max_uses,
                 created_by_id=admin.id,
                 expires_at=utcnow() + timedelta(days=body.expires_in_days)
                 if body.expires_in_days else None)
    db.add(inv)
    await db.flush()
    await L.audit(db, admin, "invite", f"Convite criado ({body.note or 'sem nota'})")
    return _invite_out(inv)


@router.delete("/invites/{invite_id}", response_model=InviteOut)
async def revoke_invite(invite_id: uuid.UUID, admin: Admin, db: DB):
    inv = await _get(db, Invite, invite_id, "Convite")
    inv.revoked = True
    await db.flush()
    return _invite_out(inv)


# ----------------------------------------------------------------------- membros
@router.get("/users", response_model=list[UserOut])
async def list_users(admin: Admin, db: DB, status_: str | None = Query(None, alias="status")):
    q = select(User).order_by(User.created_at.desc())
    if status_:
        q = q.where(User.status == status_)
    res = await db.execute(q)
    return list(res.scalars())


@router.post("/users/{user_id}/approve", response_model=UserOut)
async def approve_user(user_id: uuid.UUID, body: ApproveIn, admin: Admin, db: DB,
                       outbox: OutboxDep):
    user = await _get(db, User, user_id, "Usuário")
    if user.status == UserStatus.APPROVED:
        raise bad("Usuário já aprovado.")
    user.status = UserStatus.APPROVED
    user.approved_at = utcnow()
    if body.category_id:
        cat = await _get(db, Category, body.category_id, "Categoria")
        try:
            await L.add_entry(db, cat, user)
        except L.LeagueError as exc:
            raise bad(str(exc))
    await L.audit(db, admin, "approve", f"{user.display_name} aprovado")
    outbox.add(M.member_approved(user.display_name))
    invite = group_invite_text(user)
    if invite and user.phone:
        outbox.add(invite, number=user.phone)  # convite do grupo, em privado
    await db.flush()
    return user


def group_invite_text(user: User) -> str | None:
    if not settings.WHATSAPP_GROUP_LINK:
        return None
    return M.group_invite(user.display_name, settings.WHATSAPP_GROUP_LINK,
                          settings.FRONTEND_URL.rstrip("/"))


@router.post("/users/{user_id}/group-invite")
async def send_group_invite(user_id: uuid.UUID, admin: Admin, db: DB):
    """Reenvia (na hora) o convite do grupo do WhatsApp para um membro aprovado."""
    user = await _get(db, User, user_id, "Usuário")
    if user.status != UserStatus.APPROVED:
        raise bad("Só membros aprovados recebem o convite do grupo.")
    if not user.phone:
        raise bad(f"{user.display_name} não tem WhatsApp cadastrado.")
    text = group_invite_text(user)
    if not text:
        raise bad("Link do grupo não configurado (WHATSAPP_GROUP_LINK).")
    if not await N.send(text, user.phone):
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "O WhatsApp não confirmou o envio. Tente de novo.")
    await L.audit(db, admin, "group_invite", f"Convite do grupo enviado para {user.display_name}")
    return {"sent": True, "phone": user.phone}


@router.post("/users/{user_id}/reject", response_model=UserOut)
async def reject_user(user_id: uuid.UUID, admin: Admin, db: DB):
    user = await _get(db, User, user_id, "Usuário")
    if user.status != UserStatus.PENDING:
        raise bad("Só cadastros pendentes podem ser recusados.")
    user.status = UserStatus.REJECTED
    await L.audit(db, admin, "reject", f"Cadastro de {user.name} recusado")
    await db.flush()
    return user


@router.patch("/users/{user_id}", response_model=UserOut)
async def patch_user(user_id: uuid.UUID, body: AdminUserIn, admin: Admin, db: DB):
    user = await _get(db, User, user_id, "Usuário")
    data = body.model_dump(exclude_unset=True)
    if data.get("role") == Role.PLAYER and user.id == admin.id:
        raise bad("Você não pode remover o próprio acesso de admin.")
    for k, v in data.items():
        setattr(user, k, v.strip() or None if isinstance(v, str) and k == "nickname" else v)
    await db.flush()
    return user


@router.delete("/users/{user_id}")
async def delete_user(user_id: uuid.UUID, admin: Admin, db: DB, outbox: OutboxDep):
    """Exclui o membro. Se já participou de temporada iniciada, preserva o histórico:
    é retirado das categorias em andamento (§9/§10) e perde o acesso."""
    user = await _get(db, User, user_id, "Usuário")
    if user.id == admin.id:
        raise bad("Você não pode excluir a si mesmo.")
    res = await db.execute(select(Entry).where(Entry.user_id == user.id))
    entries = list(res.scalars().unique())
    started = []
    for e in entries:
        cat = await db.get(Category, e.category_id)
        if cat.phase == Phase.REGISTRATION:
            await db.delete(e)
        else:
            started.append((e, cat))
    if not started:
        name = user.display_name
        await db.delete(user)
        await L.audit(db, admin, "user_delete", f"{name} excluído")
        await db.flush()
        return {"deleted": True, "kept_history": False}
    for e, cat in started:
        if e.status in (EntryStatus.ACTIVE, EntryStatus.WAITLIST) and cat.phase != Phase.FINISHED:
            await L.withdraw_entry(db, e, admin, "Exclusão pela organização", True, outbox)
    user.status = UserStatus.REMOVED
    await L.audit(db, admin, "user_remove", f"{user.display_name} removido (histórico mantido)")
    await db.flush()
    return {"deleted": False, "kept_history": True}


@router.get("/audit", response_model=list[AuditOut])
async def audit_log(admin: Admin, db: DB, limit: int = Query(100, le=500)):
    res = await db.execute(select(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit))
    return list(res.scalars())


# ------------------------------------------------------------ temporada/categoria
@router.post("/seasons", response_model=SeasonOut, status_code=201)
async def create_season(body: SeasonIn, admin: Admin, db: DB):
    res = await db.execute(select(Season).where(Season.is_current.is_(True)))
    for s in res.scalars():
        s.is_current = False
    season = Season(name=body.name, announcement=body.announcement, is_current=True)
    db.add(season)
    await db.flush()
    db.add(Category(season_id=season.id, name=body.category_name))
    await L.audit(db, admin, "season", f"Temporada {body.name} criada")
    await db.flush()
    await db.refresh(season, ["categories"])
    return season


@router.patch("/seasons/{season_id}", response_model=SeasonOut)
async def patch_season(season_id: uuid.UUID, body: SeasonPatch, admin: Admin, db: DB):
    season = await _get(db, Season, season_id, "Temporada")
    data = body.model_dump(exclude_unset=True)
    if data.get("is_current"):
        res = await db.execute(select(Season).where(Season.id != season.id))
        for s in res.scalars():
            s.is_current = False
    for k, v in data.items():
        setattr(season, k, v)
    await db.flush()
    await db.refresh(season, ["categories"])
    return season


@router.post("/seasons/{season_id}/categories", response_model=CategoryBrief, status_code=201)
async def add_category(season_id: uuid.UUID, body: CategoryIn, admin: Admin, db: DB):
    await _get(db, Season, season_id, "Temporada")
    cat = Category(season_id=season_id, name=body.name)
    db.add(cat)
    await db.flush()
    return cat


@router.patch("/categories/{category_id}", response_model=CategoryBrief)
async def patch_category(category_id: uuid.UUID, body: CategoryPatch, admin: Admin, db: DB):
    cat = await _get(db, Category, category_id, "Categoria")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(cat, k, v)
    res = await db.execute(select(Match).where(Match.category_id == cat.id,
                                               Match.stage != "group"))
    for m in res.scalars().unique():
        m.deadline = cat.semis_date if m.stage == "semifinal" else cat.final_date
    await db.flush()
    return cat


@router.delete("/categories/{category_id}")
async def delete_category(category_id: uuid.UUID, admin: Admin, db: DB):
    cat = await _get(db, Category, category_id, "Categoria")
    if cat.phase != Phase.REGISTRATION:
        raise bad("Só é possível excluir categorias que ainda não começaram.")
    await db.execute(delete(Entry).where(Entry.category_id == cat.id))
    await db.delete(cat)
    return {"deleted": True}


# --------------------------------------------------------------------- inscrições
@router.post("/categories/{category_id}/entries", response_model=EntryOut, status_code=201)
async def add_entry(category_id: uuid.UUID, body: EntryAddIn, admin: Admin, db: DB):
    cat = await _get(db, Category, category_id, "Categoria")
    user = await _get(db, User, body.user_id, "Usuário")
    if user.status != UserStatus.APPROVED:
        raise bad("Aprove o cadastro antes de inscrever.")
    try:
        return await L.add_entry(db, cat, user)
    except L.LeagueError as exc:
        raise bad(str(exc))


@router.put("/categories/{category_id}/seeds", response_model=list[EntryOut])
async def set_seeds(category_id: uuid.UUID, body: SeedOrderIn, admin: Admin, db: DB):
    """Ordem de nível (ranking anterior / avaliação técnica) usada na serpentina."""
    cat = await _get(db, Category, category_id, "Categoria")
    if cat.phase != Phase.REGISTRATION:
        raise bad("Cabeças de chave só podem mudar antes do sorteio.")
    entries = {e.id: e for e in await L.get_entries(db, cat)}
    if set(body.entry_ids) - set(entries):
        raise bad("Inscrição desconhecida na lista.")
    for i, eid in enumerate(body.entry_ids, 1):
        entries[eid].seed = i
    rest = [e for e in entries.values() if e.id not in set(body.entry_ids)]
    for j, e in enumerate(rest, len(body.entry_ids) + 1):
        e.seed = j
    await db.flush()
    return await L.get_entries(db, cat)


@router.patch("/entries/{entry_id}", response_model=EntryOut)
async def patch_entry(entry_id: uuid.UUID, body: EntryPatch, admin: Admin, db: DB):
    e = await _get(db, Entry, entry_id, "Inscrição")
    cat = await db.get(Category, e.category_id)
    if cat.phase != Phase.REGISTRATION:
        raise bad("Inscrições não mudam depois do sorteio (use retirar/substituir).")
    data = body.model_dump(exclude_unset=True)
    if data.get("status") == EntryStatus.ACTIVE and e.status != EntryStatus.ACTIVE:
        active = [x for x in await L.get_entries(db, cat) if x.status == EntryStatus.ACTIVE]
        if len(active) >= 20:
            raise bad("Categoria cheia (20). Mova alguém para a lista de espera antes.")
    for k, v in data.items():
        setattr(e, k, v)
    await db.flush()
    return e


@router.delete("/entries/{entry_id}")
async def delete_entry(entry_id: uuid.UUID, admin: Admin, db: DB):
    e = await _get(db, Entry, entry_id, "Inscrição")
    cat = await db.get(Category, e.category_id)
    if cat.phase != Phase.REGISTRATION:
        raise bad("Depois do sorteio, use 'retirar' (regulamento §9).")
    await db.delete(e)
    return {"deleted": True}


@router.post("/entries/{entry_id}/withdraw", response_model=EntryOut)
async def withdraw(entry_id: uuid.UUID, body: WithdrawIn, admin: Admin, db: DB,
                   outbox: OutboxDep):
    e = await _get(db, Entry, entry_id, "Inscrição")
    try:
        await L.withdraw_entry(db, e, admin, body.reason, body.exclude, outbox)
    except L.LeagueError as exc:
        raise bad(str(exc))
    return e


@router.post("/entries/{entry_id}/substitute", response_model=EntryOut)
async def substitute(entry_id: uuid.UUID, body: SubstituteIn, admin: Admin, db: DB):
    e = await _get(db, Entry, entry_id, "Inscrição")
    user = await _get(db, User, body.user_id, "Usuário")
    if user.status != UserStatus.APPROVED:
        raise bad("O substituto precisa estar aprovado.")
    try:
        return await L.substitute_entry(db, e, user, admin)
    except L.LeagueError as exc:
        raise bad(str(exc))


# ----------------------------------------------------------- sorteio e fases
@router.post("/categories/{category_id}/draw", response_model=CategoryDetail)
async def draw(category_id: uuid.UUID, body: DrawIn, admin: Admin, db: DB, outbox: OutboxDep):
    cat = await _get(db, Category, category_id, "Categoria")
    try:
        await L.generate_draw(db, cat, body.start_date, admin, outbox)
    except L.LeagueError as exc:
        raise bad(str(exc))
    return await build_detail(db, cat, outbox)


@router.delete("/categories/{category_id}/draw", response_model=CategoryDetail)
async def undo_draw(category_id: uuid.UUID, admin: Admin, db: DB, outbox: OutboxDep):
    cat = await _get(db, Category, category_id, "Categoria")
    try:
        await L.reset_draw(db, cat, admin)
    except L.LeagueError as exc:
        raise bad(str(exc))
    return await build_detail(db, cat, outbox)


@router.post("/categories/{category_id}/lottery")
async def lottery(category_id: uuid.UUID, admin: Admin, db: DB):
    cat = await _get(db, Category, category_id, "Categoria")
    drawn = await L.run_lottery(db, cat, admin)
    return {"drawn": drawn}


@router.post("/categories/{category_id}/homologate", response_model=CategoryDetail)
async def homologate(category_id: uuid.UUID, admin: Admin, db: DB, outbox: OutboxDep):
    cat = await _get(db, Category, category_id, "Categoria")
    try:
        await L.homologate(db, cat, admin, outbox)
    except L.LeagueError as exc:
        raise bad(str(exc))
    return await build_detail(db, cat, outbox)


@router.post("/categories/{category_id}/semifinals", response_model=CategoryDetail)
async def semifinals(category_id: uuid.UUID, admin: Admin, db: DB, outbox: OutboxDep):
    cat = await _get(db, Category, category_id, "Categoria")
    try:
        await L.generate_semis(db, cat, admin, outbox)
    except L.LeagueError as exc:
        raise bad(str(exc))
    return await build_detail(db, cat, outbox)


# ---------------------------------------------------------------------- partidas
@router.put("/matches/{match_id}", response_model=MatchOut)
async def set_match(match_id: uuid.UUID, body: AdminMatchIn, admin: Admin, db: DB,
                    outbox: OutboxDep):
    m = await _get(db, Match, match_id, "Partida")
    if body.deadline is not None:
        m.deadline = body.deadline
    try:
        await L.admin_set_match(db, m, admin, status=body.status, result_type=body.result_type,
                                score=body.score, winner_side=body.winner_side,
                                played_on=body.played_on, note=body.note, outbox=outbox)
    except L.LeagueError as exc:
        raise bad(str(exc))
    return match_out(m)


@router.get("/matches/pending", response_model=list[MatchOut])
async def pending_matches(admin: Admin, db: DB):
    """Contestadas e interrompidas: o que precisa de decisão da organização."""
    res = await db.execute(select(Match).where(
        or_(Match.status == MatchStatus.CONTESTED, Match.status == MatchStatus.INTERRUPTED)))
    return [match_out(m) for m in res.scalars().unique()]


@router.patch("/matches/{match_id}/deadline", response_model=MatchOut)
async def set_deadline(match_id: uuid.UUID, body: DeadlineIn, admin: Admin, db: DB):
    m = await _get(db, Match, match_id, "Partida")
    m.deadline = body.deadline
    await L.audit(db, admin, "deadline", f"Prazo de {L.name_of(m.entry1)} × {L.name_of(m.entry2)}"
                  f" → {body.deadline:%d/%m}")
    await db.flush()
    return match_out(m)
