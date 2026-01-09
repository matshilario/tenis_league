import uuid
from typing import List

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select

from app.api.deps import CurrentTenant, CurrentUser, DB
from app.models.league import League
from app.models.player import Player
from app.models.ranking import RankingHistory
from app.schemas.ranking import HeadToHeadResponse, RankingHistoryResponse, RankingResponse
from app.services.ranking_service import RankingService

router = APIRouter()


@router.get("/league/{league_id}", response_model=List[RankingResponse])
async def get_league_ranking(
    league_id: uuid.UUID,
    tenant: CurrentTenant,
    current_user: CurrentUser,
    db: DB,
):
    """Get the current ranking for a league."""
    # Verify league exists
    league_query = select(League).where(
        League.id == league_id,
        League.tenant_id == tenant.id,
    )
    league_result = await db.execute(league_query)
    league = league_result.scalar_one_or_none()

    if not league:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="League not found",
        )

    ranking_service = RankingService(db)
    ranking = await ranking_service.get_league_ranking(league_id, league.ranking_system)

    return [RankingResponse(**r) for r in ranking]


@router.get("/player/{player_id}/history", response_model=List[RankingHistoryResponse])
async def get_player_ranking_history(
    player_id: uuid.UUID,
    tenant: CurrentTenant,
    current_user: CurrentUser,
    db: DB,
    league_id: uuid.UUID | None = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
):
    """Get ranking history for a player."""
    # Verify player exists
    player_query = select(Player).where(
        Player.id == player_id,
        Player.tenant_id == tenant.id,
    )
    player_result = await db.execute(player_query)
    player = player_result.scalar_one_or_none()

    if not player:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Player not found",
        )

    query = select(RankingHistory).where(
        RankingHistory.player_id == player_id,
        RankingHistory.tenant_id == tenant.id,
    )

    if league_id:
        query = query.where(RankingHistory.league_id == league_id)

    query = query.offset(skip).limit(limit).order_by(RankingHistory.recorded_at.desc())

    result = await db.execute(query)
    history = list(result.scalars().all())

    return [
        RankingHistoryResponse(
            id=h.id,
            player_id=h.player_id,
            match_id=h.match_id,
            rating_before=h.rating_before,
            rating_after=h.rating_after,
            rating_change=h.rating_after - h.rating_before,
            points_before=h.points_before,
            points_after=h.points_after,
            points_change=h.points_after - h.points_before,
            recorded_at=h.recorded_at,
        )
        for h in history
    ]


@router.get("/head-to-head", response_model=HeadToHeadResponse)
async def get_head_to_head(
    player1_id: uuid.UUID,
    player2_id: uuid.UUID,
    tenant: CurrentTenant,
    current_user: CurrentUser,
    db: DB,
):
    """Get head-to-head statistics between two players."""
    # Verify both players exist
    players_query = select(Player).where(
        Player.id.in_([player1_id, player2_id]),
        Player.tenant_id == tenant.id,
    )
    players_result = await db.execute(players_query)
    players = {p.id: p for p in players_result.scalars().all()}

    if len(players) != 2:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="One or both players not found",
        )

    ranking_service = RankingService(db)
    h2h = await ranking_service.get_head_to_head(tenant.id, player1_id, player2_id)

    return HeadToHeadResponse(
        player1_id=player1_id,
        player1_name=players[player1_id].name,
        player2_id=player2_id,
        player2_name=players[player2_id].name,
        player1_wins=h2h["player1_wins"],
        player2_wins=h2h["player2_wins"],
        total_matches=h2h["total_matches"],
        matches=h2h["matches"],
    )
