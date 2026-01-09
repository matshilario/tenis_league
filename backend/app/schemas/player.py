from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

from app.models.player import PlayerCategory


class PlayerBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    email: EmailStr | None = None
    phone: str | None = Field(None, max_length=20)
    category: PlayerCategory = PlayerCategory.INTERMEDIATE
    avatar_url: str | None = None


class PlayerCreate(PlayerBase):
    user_id: UUID | None = None


class PlayerUpdate(BaseModel):
    name: str | None = Field(None, min_length=2, max_length=255)
    email: EmailStr | None = None
    phone: str | None = Field(None, max_length=20)
    category: PlayerCategory | None = None
    avatar_url: str | None = None
    is_active: bool | None = None


class PlayerResponse(PlayerBase):
    id: UUID
    tenant_id: UUID
    user_id: UUID | None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PlayerWithStatsResponse(PlayerResponse):
    total_matches: int = 0
    wins: int = 0
    losses: int = 0
    win_rate: float = 0.0
    current_elo: int = 1500
    current_points: int = 0
