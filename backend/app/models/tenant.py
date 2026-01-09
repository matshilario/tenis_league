from sqlalchemy import Boolean, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin, UUIDMixin


class Tenant(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "tenants"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    logo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    primary_color: Mapped[str] = mapped_column(String(7), default="#3B82F6")
    settings: Mapped[dict] = mapped_column(JSONB, default=dict)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Relationships
    users = relationship("User", back_populates="tenant", lazy="dynamic")
    players = relationship("Player", back_populates="tenant", lazy="dynamic")
    leagues = relationship("League", back_populates="tenant", lazy="dynamic")
    matches = relationship("Match", back_populates="tenant", lazy="dynamic")
    tournaments = relationship("Tournament", back_populates="tenant", lazy="dynamic")
    schedules = relationship("Schedule", back_populates="tenant", lazy="dynamic")
