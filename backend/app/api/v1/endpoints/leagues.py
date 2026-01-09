import uuid
from typing import List

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select

from app.api.deps import CurrentTenant, CurrentUser, DB, ManagerOrAdmin
from app.models.league import League, LeaguePlayer
from app.models.player import Player
from app.schemas.league import (
    AddPlayerToLeagueRequest,
    LeagueCreate,
    LeaguePlayerResponse,
    LeagueResponse,
    LeagueUpdate,
)

router = APIRouter()


@router.post("/", response_model=LeagueResponse, status_code=status.HTTP_201_CREATED)
async def create_league(
    league_in: LeagueCreate,
    tenant: CurrentTenant,
    current_user: ManagerOrAdmin,
    db: DB,
):
    """Create a new league (manager/admin only)."""
    league = League(
        tenant_id=tenant.id,
        name=league_in.name,
        description=league_in.description,
        ranking_system=league_in.ranking_system,
        match_format=league_in.match_format,
        season_start=league_in.season_start,
        season_end=league_in.season_end,
    )
    db.add(league)
    await db.flush()
    await db.refresh(league)

    return league


@router.get("/", response_model=List[LeagueResponse])
async def list_leagues(
    tenant: CurrentTenant,
    current_user: CurrentUser,
    db: DB,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    active_only: bool = True,
):
    """List all leagues in the tenant."""
    query = select(League).where(League.tenant_id == tenant.id)

    if active_only:
        query = query.where(League.is_active == True)

    query = query.offset(skip).limit(limit).order_by(League.created_at.desc())

    result = await db.execute(query)
    return list(result.scalars().all())


@router.get("/{league_id}", response_model=LeagueResponse)
async def get_league(
    league_id: uuid.UUID,
    tenant: CurrentTenant,
    current_user: CurrentUser,
    db: DB,
):
    """Get a league by ID."""
    query = select(League).where(
        League.id == league_id,
        League.tenant_id == tenant.id,
    )
    result = await db.execute(query)
    league = result.scalar_one_or_none()

    if not league:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="League not found",
        )

    return league


@router.patch("/{league_id}", response_model=LeagueResponse)
async def update_league(
    league_id: uuid.UUID,
    league_update: LeagueUpdate,
    tenant: CurrentTenant,
    current_user: ManagerOrAdmin,
    db: DB,
):
    """Update a league (manager/admin only)."""
    query = select(League).where(
        League.id == league_id,
        League.tenant_id == tenant.id,
    )
    result = await db.execute(query)
    league = result.scalar_one_or_none()

    if not league:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="League not found",
        )

    update_data = league_update.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(league, field, value)

    await db.flush()
    await db.refresh(league)

    return league


@router.post("/{league_id}/players", response_model=LeaguePlayerResponse, status_code=status.HTTP_201_CREATED)
async def add_player_to_league(
    league_id: uuid.UUID,
    request: AddPlayerToLeagueRequest,
    tenant: CurrentTenant,
    current_user: ManagerOrAdmin,
    db: DB,
):
    """Add a player to a league (manager/admin only)."""
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

    # Verify player exists
    player_query = select(Player).where(
        Player.id == request.player_id,
        Player.tenant_id == tenant.id,
    )
    player_result = await db.execute(player_query)
    player = player_result.scalar_one_or_none()

    if not player:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Player not found",
        )

    # Check if player is already in league
    existing_query = select(LeaguePlayer).where(
        LeaguePlayer.league_id == league_id,
        LeaguePlayer.player_id == request.player_id,
    )
    existing_result = await db.execute(existing_query)
    existing = existing_result.scalar_one_or_none()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Player is already in this league",
        )

    # Add player to league
    league_player = LeaguePlayer(
        league_id=league_id,
        player_id=request.player_id,
    )
    db.add(league_player)
    await db.flush()
    await db.refresh(league_player)

    return LeaguePlayerResponse(
        id=league_player.id,
        league_id=league_player.league_id,
        player_id=league_player.player_id,
        player_name=player.name,
        elo_rating=league_player.elo_rating,
        points=league_player.points,
        wins=league_player.wins,
        losses=league_player.losses,
        joined_at=league_player.joined_at,
    )


@router.get("/{league_id}/players", response_model=List[LeaguePlayerResponse])
async def list_league_players(
    league_id: uuid.UUID,
    tenant: CurrentTenant,
    current_user: CurrentUser,
    db: DB,
):
    """List all players in a league."""
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

    # Get league players with player info
    query = (
        select(LeaguePlayer, Player)
        .join(Player, LeaguePlayer.player_id == Player.id)
        .where(LeaguePlayer.league_id == league_id)
        .order_by(LeaguePlayer.elo_rating.desc())
    )

    result = await db.execute(query)
    rows = result.all()

    return [
        LeaguePlayerResponse(
            id=lp.id,
            league_id=lp.league_id,
            player_id=lp.player_id,
            player_name=player.name,
            elo_rating=lp.elo_rating,
            points=lp.points,
            wins=lp.wins,
            losses=lp.losses,
            joined_at=lp.joined_at,
        )
        for lp, player in rows
    ]


@router.delete("/{league_id}/players/{player_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_player_from_league(
    league_id: uuid.UUID,
    player_id: uuid.UUID,
    tenant: CurrentTenant,
    current_user: ManagerOrAdmin,
    db: DB,
):
    """Remove a player from a league (manager/admin only)."""
    query = select(LeaguePlayer).where(
        LeaguePlayer.league_id == league_id,
        LeaguePlayer.player_id == player_id,
    )
    result = await db.execute(query)
    league_player = result.scalar_one_or_none()

    if not league_player:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Player not found in league",
        )

    await db.delete(league_player)
