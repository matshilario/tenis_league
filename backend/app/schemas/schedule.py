from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.schedule import ResponseStatus, ScheduleStatus


class ScheduleBase(BaseModel):
    proposed_datetime: datetime
    location: str | None = Field(None, max_length=255)
    notes: str | None = None


class ScheduleCreate(ScheduleBase):
    league_id: UUID | None = None
    player1_id: UUID
    player2_id: UUID


class ScheduleUpdate(BaseModel):
    proposed_datetime: datetime | None = None
    location: str | None = Field(None, max_length=255)
    notes: str | None = None
    status: ScheduleStatus | None = None


class ScheduleRespondRequest(BaseModel):
    response: ResponseStatus


class ScheduleResponse(ScheduleBase):
    id: UUID
    tenant_id: UUID
    league_id: UUID | None
    match_id: UUID | None
    player1_id: UUID
    player2_id: UUID
    proposed_by: UUID
    status: ScheduleStatus
    player1_response: ResponseStatus
    player2_response: ResponseStatus
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ScheduleWithPlayersResponse(ScheduleResponse):
    player1_name: str
    player2_name: str
    proposer_name: str
