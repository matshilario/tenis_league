import enum
import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TenantMixin, TimestampMixin, UUIDMixin


class TournamentFormat(str, enum.Enum):
    SINGLE_ELIMINATION = "single_elimination"
    DOUBLE_ELIMINATION = "double_elimination"


class TournamentStatus(str, enum.Enum):
    DRAFT = "draft"
    REGISTRATION = "registration"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


class ParticipantStatus(str, enum.Enum):
    REGISTERED = "registered"
    ELIMINATED = "eliminated"
    WINNER = "winner"


class Tournament(Base, UUIDMixin, TenantMixin, TimestampMixin):
    __tablename__ = "tournaments"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    format: Mapped[TournamentFormat] = mapped_column(
        Enum(TournamentFormat), default=TournamentFormat.SINGLE_ELIMINATION, nullable=False
    )
    size: Mapped[int] = mapped_column(Integer, default=8)
    status: Mapped[TournamentStatus] = mapped_column(
        Enum(TournamentStatus), default=TournamentStatus.DRAFT, nullable=False
    )
    registration_deadline: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    settings: Mapped[dict] = mapped_column(JSONB, default=dict)

    # Foreign Keys
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True
    )
    league_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("leagues.id"), nullable=True, index=True
    )

    # Relationships
    tenant = relationship("Tenant", back_populates="tournaments")
    league = relationship("League", back_populates="tournaments")
    participants = relationship("TournamentParticipant", back_populates="tournament")
    matches = relationship("Match", back_populates="tournament")
    tournament_matches = relationship("TournamentMatch", back_populates="tournament")


class TournamentParticipant(Base, UUIDMixin):
    __tablename__ = "tournament_participants"

    seed: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[ParticipantStatus] = mapped_column(
        Enum(ParticipantStatus), default=ParticipantStatus.REGISTERED, nullable=False
    )
    registered_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )

    # Foreign Keys
    tournament_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tournaments.id"), nullable=False, index=True
    )
    player_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("players.id"), nullable=False, index=True
    )

    # Relationships
    tournament = relationship("Tournament", back_populates="participants")
    player = relationship("Player", back_populates="tournament_participations")


class TournamentMatch(Base, UUIDMixin):
    __tablename__ = "tournament_matches"

    round: Mapped[int] = mapped_column(Integer, nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False)

    # Foreign Keys
    tournament_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tournaments.id"), nullable=False, index=True
    )
    match_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("matches.id"), nullable=True
    )
    player1_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("players.id"), nullable=True
    )
    player2_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("players.id"), nullable=True
    )
    winner_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("players.id"), nullable=True
    )
    next_match_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tournament_matches.id"), nullable=True
    )

    # Relationships
    tournament = relationship("Tournament", back_populates="tournament_matches")
    match = relationship("Match", back_populates="tournament_match")
    player1 = relationship("Player", foreign_keys=[player1_id])
    player2 = relationship("Player", foreign_keys=[player2_id])
    winner = relationship("Player", foreign_keys=[winner_id])
    next_match = relationship("TournamentMatch", remote_side="TournamentMatch.id")
