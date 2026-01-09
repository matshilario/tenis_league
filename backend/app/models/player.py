import enum
import uuid

from sqlalchemy import Boolean, Enum, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TenantMixin, TimestampMixin, UUIDMixin


class PlayerCategory(str, enum.Enum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"


class Player(Base, UUIDMixin, TenantMixin, TimestampMixin):
    __tablename__ = "players"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    category: Mapped[PlayerCategory] = mapped_column(
        Enum(PlayerCategory), default=PlayerCategory.INTERMEDIATE, nullable=False
    )
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Foreign Keys
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, unique=True
    )

    # Relationships
    tenant = relationship("Tenant", back_populates="players")
    user = relationship("User", back_populates="player")
    league_players = relationship("LeaguePlayer", back_populates="player")
    matches_as_player1 = relationship(
        "Match", foreign_keys="Match.player1_id", back_populates="player1"
    )
    matches_as_player2 = relationship(
        "Match", foreign_keys="Match.player2_id", back_populates="player2"
    )
    tournament_participations = relationship(
        "TournamentParticipant", back_populates="player"
    )
    ranking_history = relationship("RankingHistory", back_populates="player")
