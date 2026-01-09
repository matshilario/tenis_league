import enum
import uuid
from datetime import date, datetime

from sqlalchemy import Boolean, Date, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TenantMixin, TimestampMixin, UUIDMixin


class RankingSystem(str, enum.Enum):
    ELO = "elo"
    POINTS = "points"


class MatchFormat(str, enum.Enum):
    BEST_OF_3 = "best_of_3"
    BEST_OF_5 = "best_of_5"


class League(Base, UUIDMixin, TenantMixin, TimestampMixin):
    __tablename__ = "leagues"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    ranking_system: Mapped[RankingSystem] = mapped_column(
        Enum(RankingSystem), default=RankingSystem.ELO, nullable=False
    )
    match_format: Mapped[MatchFormat] = mapped_column(
        Enum(MatchFormat), default=MatchFormat.BEST_OF_3, nullable=False
    )
    season_start: Mapped[date | None] = mapped_column(Date, nullable=True)
    season_end: Mapped[date | None] = mapped_column(Date, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    settings: Mapped[dict] = mapped_column(JSONB, default=dict)

    # Foreign Keys
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True
    )

    # Relationships
    tenant = relationship("Tenant", back_populates="leagues")
    league_players = relationship("LeaguePlayer", back_populates="league")
    matches = relationship("Match", back_populates="league")
    tournaments = relationship("Tournament", back_populates="league")
    ranking_history = relationship("RankingHistory", back_populates="league")


class LeaguePlayer(Base, UUIDMixin):
    __tablename__ = "league_players"

    elo_rating: Mapped[int] = mapped_column(Integer, default=1500)
    points: Mapped[int] = mapped_column(Integer, default=0)
    wins: Mapped[int] = mapped_column(Integer, default=0)
    losses: Mapped[int] = mapped_column(Integer, default=0)
    joined_at: Mapped[datetime] = mapped_column(
        default=datetime.utcnow, nullable=False
    )

    # Foreign Keys
    league_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("leagues.id"), nullable=False, index=True
    )
    player_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("players.id"), nullable=False, index=True
    )

    # Relationships
    league = relationship("League", back_populates="league_players")
    player = relationship("Player", back_populates="league_players")
