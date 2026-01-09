from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.tournament import ParticipantStatus, TournamentFormat, TournamentStatus


class TournamentBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    description: str | None = None
    format: TournamentFormat = TournamentFormat.SINGLE_ELIMINATION
    size: int = Field(default=8, ge=4, le=64)
    registration_deadline: datetime | None = None
    start_date: date | None = None
    end_date: date | None = None


class TournamentCreate(TournamentBase):
    league_id: UUID | None = None


class TournamentUpdate(BaseModel):
    name: str | None = Field(None, min_length=2, max_length=255)
    description: str | None = None
    format: TournamentFormat | None = None
    size: int | None = Field(None, ge=4, le=64)
    status: TournamentStatus | None = None
    registration_deadline: datetime | None = None
    start_date: date | None = None
    end_date: date | None = None
    settings: dict | None = None


class TournamentResponse(TournamentBase):
    id: UUID
    tenant_id: UUID
    league_id: UUID | None
    status: TournamentStatus
    settings: dict
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TournamentParticipantResponse(BaseModel):
    id: UUID
    tournament_id: UUID
    player_id: UUID
    player_name: str
    seed: int | None
    status: ParticipantStatus
    registered_at: datetime

    class Config:
        from_attributes = True


class RegisterParticipantRequest(BaseModel):
    player_id: UUID
    seed: int | None = None


class TournamentMatchResponse(BaseModel):
    id: UUID
    tournament_id: UUID
    match_id: UUID | None
    round: int
    position: int
    player1_id: UUID | None
    player1_name: str | None
    player2_id: UUID | None
    player2_name: str | None
    winner_id: UUID | None
    winner_name: str | None
    next_match_id: UUID | None
    score: dict | None = None

    class Config:
        from_attributes = True


class TournamentBracketResponse(BaseModel):
    tournament: TournamentResponse
    participants: list[TournamentParticipantResponse]
    matches: list[TournamentMatchResponse]
    rounds: int
