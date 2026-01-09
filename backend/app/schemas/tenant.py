from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class TenantBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    slug: str = Field(..., min_length=2, max_length=100, pattern=r"^[a-z0-9-]+$")
    logo_url: str | None = None
    primary_color: str = Field(default="#3B82F6", pattern=r"^#[0-9A-Fa-f]{6}$")


class TenantCreate(TenantBase):
    pass


class TenantUpdate(BaseModel):
    name: str | None = Field(None, min_length=2, max_length=255)
    logo_url: str | None = None
    primary_color: str | None = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    settings: dict | None = None


class TenantResponse(TenantBase):
    id: UUID
    settings: dict
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
