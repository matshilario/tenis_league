import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TenantMixin, UUIDMixin


class RankingHistory(Base, UUIDMixin, TenantMixin):
    __tablename__ = "ranking_history"

    rating_before: Mapped[int] = mapped_column(Integer, nullable=False)
    rating_after: Mapped[int] = mapped_column(Integer, nullable=False)
    points_before: Mapped[int] = mapped_column(Integer, default=0)
    points_after: Mapped[int] = mapped_column(Integer, default=0)
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Foreign Keys
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True
    )
    league_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("leagues.id"), nullable=False, index=True
    )
    player_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("players.id"), nullable=False, index=True
    )
    match_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("matches.id"), nullable=False, index=True
    )

    # Relationships
    league = relationship("League", back_populates="ranking_history")
    player = relationship("Player", back_populates="ranking_history")
    match = relationship("Match", back_populates="ranking_history")
