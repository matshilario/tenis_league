from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.models.match import MatchStatus


class SetScore(BaseModel):
    player1_games: int = Field(..., ge=0, le=7)
    player2_games: int = Field(..., ge=0, le=7)


class MatchScore(BaseModel):
    sets: list[list[int]]

    @field_validator("sets")
    @classmethod
    def validate_sets(cls, v):
        for s in v:
            if len(s) != 2:
                raise ValueError("Each set must have exactly 2 scores")
            if not all(0 <= score <= 7 for score in s):
                raise ValueError("Set scores must be between 0 and 7")
        return v


class MatchBase(BaseModel):
    league_id: UUID
    player1_id: UUID
    player2_id: UUID
    played_at: datetime | None = None


class MatchCreate(MatchBase):
    score: MatchScore | None = None
    winner_id: UUID | None = None
    tournament_id: UUID | None = None
    is_walkover: bool = False
    walkover_player_id: UUID | None = None
    notes: str | None = None


class MatchUpdate(BaseModel):
    score: MatchScore | None = None
    winner_id: UUID | None = None
    played_at: datetime | None = None
    notes: str | None = None
    status: MatchStatus | None = None


class MatchConfirm(BaseModel):
    confirmed: bool = True


class MatchResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    league_id: UUID
    tournament_id: UUID | None
    player1_id: UUID
    player2_id: UUID
    winner_id: UUID | None
    score: dict | None
    played_at: datetime | None
    confirmed_by_player1: bool
    confirmed_by_player2: bool
    confirmed_by_admin: bool
    status: MatchStatus
    is_walkover: bool
    walkover_player_id: UUID | None
    notes: str | None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class MatchWithPlayersResponse(MatchResponse):
    player1_name: str
    player2_name: str
    winner_name: str | None = None
