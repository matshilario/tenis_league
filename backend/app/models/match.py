import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TenantMixin, TimestampMixin, UUIDMixin


class MatchStatus(str, enum.Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    DISPUTED = "disputed"
    CANCELLED = "cancelled"


class Match(Base, UUIDMixin, TenantMixin, TimestampMixin):
    __tablename__ = "matches"

    score: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    played_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    confirmed_by_player1: Mapped[bool] = mapped_column(Boolean, default=False)
    confirmed_by_player2: Mapped[bool] = mapped_column(Boolean, default=False)
    confirmed_by_admin: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[MatchStatus] = mapped_column(
        Enum(MatchStatus), default=MatchStatus.PENDING, nullable=False
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_walkover: Mapped[bool] = mapped_column(Boolean, default=False)
    walkover_player_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )

    # Foreign Keys
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True
    )
    league_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("leagues.id"), nullable=False, index=True
    )
    tournament_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tournaments.id"), nullable=True, index=True
    )
    player1_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("players.id"), nullable=False, index=True
    )
    player2_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("players.id"), nullable=False, index=True
    )
    winner_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("players.id"), nullable=True
    )

    # Relationships
    tenant = relationship("Tenant", back_populates="matches")
    league = relationship("League", back_populates="matches")
    tournament = relationship("Tournament", back_populates="matches")
    player1 = relationship(
        "Player", foreign_keys=[player1_id], back_populates="matches_as_player1"
    )
    player2 = relationship(
        "Player", foreign_keys=[player2_id], back_populates="matches_as_player2"
    )
    winner = relationship("Player", foreign_keys=[winner_id])
    ranking_history = relationship("RankingHistory", back_populates="match")
    tournament_match = relationship("TournamentMatch", back_populates="match", uselist=False)
    schedule = relationship("Schedule", back_populates="match", uselist=False)
