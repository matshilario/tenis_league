from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class RankingResponse(BaseModel):
    position: int
    player_id: UUID
    player_name: str
    elo_rating: int
    points: int
    wins: int
    losses: int
    win_rate: float

    class Config:
        from_attributes = True


class RankingHistoryResponse(BaseModel):
    id: UUID
    player_id: UUID
    match_id: UUID
    rating_before: int
    rating_after: int
    rating_change: int
    points_before: int
    points_after: int
    points_change: int
    recorded_at: datetime

    class Config:
        from_attributes = True


class HeadToHeadResponse(BaseModel):
    player1_id: UUID
    player1_name: str
    player2_id: UUID
    player2_name: str
    player1_wins: int
    player2_wins: int
    total_matches: int
    matches: list[dict]
