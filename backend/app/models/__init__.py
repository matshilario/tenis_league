"""Modelos do banco. Tipos portáveis (Postgres em produção, SQLite nos testes)."""

from __future__ import annotations

import uuid
from datetime import date, datetime, timezone

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def aware(dt: datetime | None) -> datetime | None:
    """SQLite devolve datetimes sem fuso; tratamos tudo como UTC."""
    if dt is None:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def _id() -> Mapped[uuid.UUID]:
    return mapped_column(Uuid, primary_key=True, default=uuid.uuid4)


def _created() -> Mapped[datetime]:
    return mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)


# ------------------------------------------------------------------- constantes
class Role:
    ADMIN = "admin"
    PLAYER = "player"


class UserStatus:
    PENDING = "pending"      # cadastrou pelo convite, aguarda aprovação
    APPROVED = "approved"
    REJECTED = "rejected"
    REMOVED = "removed"      # excluído pelo admin, mas com histórico preservado


class Phase:
    REGISTRATION = "registration"
    GROUP_STAGE = "group_stage"
    KNOCKOUT = "knockout"
    FINISHED = "finished"


class EntryStatus:
    ACTIVE = "active"
    WAITLIST = "waitlist"
    WITHDRAWN = "withdrawn"  # desistência ou 2 W.O. (§9)
    EXCLUDED = "excluded"    # exclusão disciplinar (§10)


class Stage:
    GROUP = "group"
    SEMIFINAL = "semifinal"
    FINAL = "final"


class MatchStatus:
    SCHEDULED = "scheduled"      # ainda não jogada
    REPORTED = "reported"        # placar informado, prazo de contestação correndo
    CONTESTED = "contested"      # adversário contestou; organização decide
    CONFIRMED = "confirmed"      # válido
    INTERRUPTED = "interrupted"  # chuva/luz/quadra: retomar do placar exato (§9)
    ANNULLED = "annulled"        # anulada por retirada de jogador (§9)
    BYE = "bye"                  # folga na chave (§9)


VALID_FOR_STANDINGS = {MatchStatus.REPORTED, MatchStatus.CONFIRMED}
FINISHED_STATUSES = {MatchStatus.REPORTED, MatchStatus.CONFIRMED, MatchStatus.BYE}


# ----------------------------------------------------------------------- tabelas
class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = _id()
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    name: Mapped[str] = mapped_column(String(120))
    nickname: Mapped[str | None] = mapped_column(String(60), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    role: Mapped[str] = mapped_column(String(20), default=Role.PLAYER)
    status: Mapped[str] = mapped_column(String(20), default=UserStatus.PENDING)
    invite_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("invites.id", ondelete="SET NULL"), nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = _created()

    @property
    def display_name(self) -> str:
        return self.nickname or self.name


class Invite(Base):
    __tablename__ = "invites"

    id: Mapped[uuid.UUID] = _id()
    token: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    note: Mapped[str | None] = mapped_column(String(200), nullable=True)
    max_uses: Mapped[int] = mapped_column(Integer, default=1)
    uses: Mapped[int] = mapped_column(Integer, default=0)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    revoked: Mapped[bool] = mapped_column(Boolean, default=False)
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL", use_alter=True), nullable=True)
    created_at: Mapped[datetime] = _created()


class Season(Base):
    __tablename__ = "seasons"

    id: Mapped[uuid.UUID] = _id()
    name: Mapped[str] = mapped_column(String(120))
    announcement: Mapped[str | None] = mapped_column(Text, nullable=True)  # comunicado
    is_current: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = _created()

    categories: Mapped[list["Category"]] = relationship(
        back_populates="season", order_by="Category.created_at")


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[uuid.UUID] = _id()
    season_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("seasons.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(80))
    phase: Mapped[str] = mapped_column(String(20), default=Phase.REGISTRATION)
    n_groups: Mapped[int | None] = mapped_column(Integer, nullable=True)
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    makeup_deadline: Mapped[date | None] = mapped_column(Date, nullable=True)
    semis_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    final_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    homologated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    champion_entry_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("entries.id", ondelete="SET NULL", use_alter=True), nullable=True)
    created_at: Mapped[datetime] = _created()

    season: Mapped[Season] = relationship(back_populates="categories")


class Entry(Base):
    """Inscrição de um jogador numa categoria."""

    __tablename__ = "entries"
    __table_args__ = (UniqueConstraint("category_id", "user_id", name="uq_entry_cat_user"),)

    id: Mapped[uuid.UUID] = _id()
    category_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("categories.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    seed: Mapped[int | None] = mapped_column(Integer, nullable=True)
    group_name: Mapped[str | None] = mapped_column(String(2), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default=EntryStatus.ACTIVE)
    eligible_finals: Mapped[bool] = mapped_column(Boolean, default=True)
    lottery_rank: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status_reason: Mapped[str | None] = mapped_column(String(300), nullable=True)
    status_changed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = _created()

    user: Mapped[User] = relationship(lazy="joined")


class Match(Base):
    __tablename__ = "matches"

    id: Mapped[uuid.UUID] = _id()
    category_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("categories.id", ondelete="CASCADE"), index=True)
    stage: Mapped[str] = mapped_column(String(20), default=Stage.GROUP)
    group_name: Mapped[str | None] = mapped_column(String(2), nullable=True)
    round: Mapped[int | None] = mapped_column(Integer, nullable=True)
    slot: Mapped[int | None] = mapped_column(Integer, nullable=True)  # 1/2 nas semis
    deadline: Mapped[date | None] = mapped_column(Date, nullable=True)
    entry1_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("entries.id", ondelete="SET NULL"), nullable=True, index=True)
    entry2_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("entries.id", ondelete="SET NULL"), nullable=True, index=True)

    status: Mapped[str] = mapped_column(String(20), default=MatchStatus.SCHEDULED)
    result_type: Mapped[str | None] = mapped_column(String(20), nullable=True)
    score: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    winner_side: Mapped[int | None] = mapped_column(Integer, nullable=True)
    played_on: Mapped[date | None] = mapped_column(Date, nullable=True)

    reported_by_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reported_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    contested_by_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    contest_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)  # interrupção, anulação…
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    entry1: Mapped[Entry | None] = relationship(foreign_keys=[entry1_id], lazy="joined")
    entry2: Mapped[Entry | None] = relationship(foreign_keys=[entry2_id], lazy="joined")

    @property
    def winner_entry_id(self) -> uuid.UUID | None:
        if self.winner_side == 1:
            return self.entry1_id
        if self.winner_side == 2:
            return self.entry2_id
        return None


class AuditLog(Base):
    __tablename__ = "audit_log"

    id: Mapped[uuid.UUID] = _id()
    actor_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action: Mapped[str] = mapped_column(String(60))
    summary: Mapped[str] = mapped_column(Text)
    details: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = _created()
