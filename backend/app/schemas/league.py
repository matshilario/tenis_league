from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.league import MatchFormat, RankingSystem


class LeagueBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    description: str | None = None
    ranking_system: RankingSystem = RankingSystem.ELO
    match_format: MatchFormat = MatchFormat.BEST_OF_3
    season_start: date | None = None
    season_end: date | None = None


class LeagueCreate(LeagueBase):
    pass


class LeagueUpdate(BaseModel):
    name: str | None = Field(None, min_length=2, max_length=255)
    description: str | None = None
    ranking_system: RankingSystem | None = None
    match_format: MatchFormat | None = None
    season_start: date | None = None
    season_end: date | None = None
    is_active: bool | None = None
    settings: dict | None = None


class LeagueResponse(LeagueBase):
    id: UUID
    tenant_id: UUID
    is_active: bool
    settings: dict
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class LeaguePlayerResponse(BaseModel):
    id: UUID
    league_id: UUID
    player_id: UUID
    player_name: str
    elo_rating: int
    points: int
    wins: int
    losses: int
    joined_at: datetime

    class Config:
        from_attributes = True


class AddPlayerToLeagueRequest(BaseModel):
    player_id: UUID
