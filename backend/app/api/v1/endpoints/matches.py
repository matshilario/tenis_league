import uuid
from typing import List

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import or_, select

from app.api.deps import CurrentTenant, CurrentUser, DB, ManagerOrAdmin
from app.models.league import League, LeaguePlayer
from app.models.match import Match, MatchStatus
from app.models.player import Player
from app.models.user import UserRole
from app.schemas.match import (
    MatchConfirm,
    MatchCreate,
    MatchResponse,
    MatchUpdate,
    MatchWithPlayersResponse,
)
from app.services.ranking_service import RankingService

router = APIRouter()


@router.post("/", response_model=MatchResponse, status_code=status.HTTP_201_CREATED)
async def create_match(
    match_in: MatchCreate,
    tenant: CurrentTenant,
    current_user: CurrentUser,
    db: DB,
):
    """Create a new match."""
    # Verify league exists and belongs to tenant
    league_query = select(League).where(
        League.id == match_in.league_id,
        League.tenant_id == tenant.id,
    )
    league_result = await db.execute(league_query)
    league = league_result.scalar_one_or_none()

    if not league:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="League not found",
        )

    # Verify both players are in the league
    players_query = select(LeaguePlayer).where(
        LeaguePlayer.league_id == match_in.league_id,
        LeaguePlayer.player_id.in_([match_in.player1_id, match_in.player2_id]),
    )
    players_result = await db.execute(players_query)
    league_players = list(players_result.scalars().all())

    if len(league_players) != 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Both players must be registered in the league",
        )

    # Create match
    match = Match(
        tenant_id=tenant.id,
        league_id=match_in.league_id,
        tournament_id=match_in.tournament_id,
        player1_id=match_in.player1_id,
        player2_id=match_in.player2_id,
        winner_id=match_in.winner_id,
        score=match_in.score.model_dump() if match_in.score else None,
        played_at=match_in.played_at,
        is_walkover=match_in.is_walkover,
        walkover_player_id=match_in.walkover_player_id,
        notes=match_in.notes,
    )

    # If admin/manager creates with winner, auto-confirm
    if current_user.role in [UserRole.ADMIN, UserRole.MANAGER] and match_in.winner_id:
        match.confirmed_by_admin = True
        match.status = MatchStatus.CONFIRMED

        # Update rankings
        ranking_service = RankingService(db)
        await ranking_service.update_rankings_after_match(match, league)

    db.add(match)
    await db.flush()
    await db.refresh(match)

    return match


@router.get("/", response_model=List[MatchWithPlayersResponse])
async def list_matches(
    tenant: CurrentTenant,
    current_user: CurrentUser,
    db: DB,
    league_id: uuid.UUID | None = None,
    player_id: uuid.UUID | None = None,
    status_filter: MatchStatus | None = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
):
    """List matches with optional filters."""
    query = (
        select(Match, Player)
        .join(Player, Match.player1_id == Player.id)
        .where(Match.tenant_id == tenant.id)
    )

    if league_id:
        query = query.where(Match.league_id == league_id)

    if player_id:
        query = query.where(
            or_(Match.player1_id == player_id, Match.player2_id == player_id)
        )

    if status_filter:
        query = query.where(Match.status == status_filter)

    query = query.offset(skip).limit(limit).order_by(Match.created_at.desc())

    result = await db.execute(query)
    rows = result.all()

    # Get player2 names
    matches_response = []
    for match, player1 in rows:
        player2_query = select(Player).where(Player.id == match.player2_id)
        player2_result = await db.execute(player2_query)
        player2 = player2_result.scalar_one()

        winner_name = None
        if match.winner_id:
            winner_name = player1.name if match.winner_id == player1.id else player2.name

        matches_response.append(
            MatchWithPlayersResponse(
                **match.__dict__,
                player1_name=player1.name,
                player2_name=player2.name,
                winner_name=winner_name,
            )
        )

    return matches_response


@router.get("/{match_id}", response_model=MatchWithPlayersResponse)
async def get_match(
    match_id: uuid.UUID,
    tenant: CurrentTenant,
    current_user: CurrentUser,
    db: DB,
):
    """Get a match by ID."""
    query = select(Match).where(
        Match.id == match_id,
        Match.tenant_id == tenant.id,
    )
    result = await db.execute(query)
    match = result.scalar_one_or_none()

    if not match:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Match not found",
        )

    # Get player names
    player1_query = select(Player).where(Player.id == match.player1_id)
    player2_query = select(Player).where(Player.id == match.player2_id)

    player1_result = await db.execute(player1_query)
    player2_result = await db.execute(player2_query)

    player1 = player1_result.scalar_one()
    player2 = player2_result.scalar_one()

    winner_name = None
    if match.winner_id:
        winner_name = player1.name if match.winner_id == player1.id else player2.name

    return MatchWithPlayersResponse(
        **match.__dict__,
        player1_name=player1.name,
        player2_name=player2.name,
        winner_name=winner_name,
    )


@router.patch("/{match_id}", response_model=MatchResponse)
async def update_match(
    match_id: uuid.UUID,
    match_update: MatchUpdate,
    tenant: CurrentTenant,
    current_user: ManagerOrAdmin,
    db: DB,
):
    """Update a match (manager/admin only)."""
    query = select(Match).where(
        Match.id == match_id,
        Match.tenant_id == tenant.id,
    )
    result = await db.execute(query)
    match = result.scalar_one_or_none()

    if not match:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Match not found",
        )

    update_data = match_update.model_dump(exclude_unset=True)

    if "score" in update_data and update_data["score"]:
        update_data["score"] = update_data["score"].model_dump()

    for field, value in update_data.items():
        setattr(match, field, value)

    await db.flush()
    await db.refresh(match)

    return match


@router.post("/{match_id}/confirm", response_model=MatchResponse)
async def confirm_match(
    match_id: uuid.UUID,
    confirm: MatchConfirm,
    tenant: CurrentTenant,
    current_user: CurrentUser,
    db: DB,
):
    """Confirm a match result (by player or admin)."""
    query = select(Match).where(
        Match.id == match_id,
        Match.tenant_id == tenant.id,
    )
    result = await db.execute(query)
    match = result.scalar_one_or_none()

    if not match:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Match not found",
        )

    if match.status == MatchStatus.CONFIRMED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Match is already confirmed",
        )

    # Check if user is admin/manager or one of the players
    is_admin = current_user.role in [UserRole.ADMIN, UserRole.MANAGER]

    # Get player linked to user
    player_query = select(Player).where(Player.user_id == current_user.id)
    player_result = await db.execute(player_query)
    user_player = player_result.scalar_one_or_none()

    is_player1 = user_player and user_player.id == match.player1_id
    is_player2 = user_player and user_player.id == match.player2_id

    if is_admin:
        match.confirmed_by_admin = confirm.confirmed
    elif is_player1:
        match.confirmed_by_player1 = confirm.confirmed
    elif is_player2:
        match.confirmed_by_player2 = confirm.confirmed
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to confirm this match",
        )

    # Check if match should be marked as confirmed
    should_confirm = (
        match.confirmed_by_admin
        or (match.confirmed_by_player1 and match.confirmed_by_player2)
    )

    if should_confirm and match.winner_id:
        match.status = MatchStatus.CONFIRMED

        # Update rankings
        league_query = select(League).where(League.id == match.league_id)
        league_result = await db.execute(league_query)
        league = league_result.scalar_one()

        ranking_service = RankingService(db)
        await ranking_service.update_rankings_after_match(match, league)

    await db.flush()
    await db.refresh(match)

    return match


@router.post("/{match_id}/dispute", response_model=MatchResponse)
async def dispute_match(
    match_id: uuid.UUID,
    tenant: CurrentTenant,
    current_user: CurrentUser,
    db: DB,
):
    """Dispute a match result."""
    query = select(Match).where(
        Match.id == match_id,
        Match.tenant_id == tenant.id,
    )
    result = await db.execute(query)
    match = result.scalar_one_or_none()

    if not match:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Match not found",
        )

    if match.status == MatchStatus.CONFIRMED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot dispute a confirmed match",
        )

    match.status = MatchStatus.DISPUTED
    await db.flush()
    await db.refresh(match)

    return match
