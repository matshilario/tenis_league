import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TenantMixin, TimestampMixin, UUIDMixin


class ScheduleStatus(str, enum.Enum):
    PROPOSED = "proposed"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class ResponseStatus(str, enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"


class Schedule(Base, UUIDMixin, TenantMixin, TimestampMixin):
    __tablename__ = "schedules"

    proposed_datetime: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[ScheduleStatus] = mapped_column(
        Enum(ScheduleStatus), default=ScheduleStatus.PROPOSED, nullable=False
    )
    player1_response: Mapped[ResponseStatus] = mapped_column(
        Enum(ResponseStatus), default=ResponseStatus.PENDING, nullable=False
    )
    player2_response: Mapped[ResponseStatus] = mapped_column(
        Enum(ResponseStatus), default=ResponseStatus.PENDING, nullable=False
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Foreign Keys
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True
    )
    league_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("leagues.id"), nullable=True, index=True
    )
    match_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("matches.id"), nullable=True
    )
    player1_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("players.id"), nullable=False, index=True
    )
    player2_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("players.id"), nullable=False, index=True
    )
    proposed_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )

    # Relationships
    tenant = relationship("Tenant", back_populates="schedules")
    league = relationship("League")
    match = relationship("Match", back_populates="schedule")
    player1 = relationship("Player", foreign_keys=[player1_id])
    player2 = relationship("Player", foreign_keys=[player2_id])
    proposer = relationship("User", foreign_keys=[proposed_by])
