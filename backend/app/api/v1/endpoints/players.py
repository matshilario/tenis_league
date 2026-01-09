import uuid
from typing import List

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, select

from app.api.deps import CurrentTenant, CurrentUser, DB, ManagerOrAdmin
from app.models.league import LeaguePlayer
from app.models.player import Player
from app.schemas.player import PlayerCreate, PlayerResponse, PlayerUpdate, PlayerWithStatsResponse

router = APIRouter()


@router.post("/", response_model=PlayerResponse, status_code=status.HTTP_201_CREATED)
async def create_player(
    player_in: PlayerCreate,
    tenant: CurrentTenant,
    current_user: ManagerOrAdmin,
    db: DB,
):
    """Create a new player (manager/admin only)."""
    player = Player(
        tenant_id=tenant.id,
        name=player_in.name,
        email=player_in.email,
        phone=player_in.phone,
        category=player_in.category,
        avatar_url=player_in.avatar_url,
        user_id=player_in.user_id,
    )
    db.add(player)
    await db.flush()
    await db.refresh(player)

    return player


@router.get("/", response_model=List[PlayerResponse])
async def list_players(
    tenant: CurrentTenant,
    current_user: CurrentUser,
    db: DB,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    active_only: bool = True,
):
    """List all players in the tenant."""
    query = select(Player).where(Player.tenant_id == tenant.id)

    if active_only:
        query = query.where(Player.is_active == True)

    query = query.offset(skip).limit(limit).order_by(Player.name)

    result = await db.execute(query)
    return list(result.scalars().all())


@router.get("/{player_id}", response_model=PlayerWithStatsResponse)
async def get_player(
    player_id: uuid.UUID,
    tenant: CurrentTenant,
    current_user: CurrentUser,
    db: DB,
):
    """Get a player by ID with statistics."""
    query = select(Player).where(
        Player.id == player_id,
        Player.tenant_id == tenant.id,
    )
    result = await db.execute(query)
    player = result.scalar_one_or_none()

    if not player:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Player not found",
        )

    # Get aggregated stats from league_players
    stats_query = select(
        func.sum(LeaguePlayer.wins).label("total_wins"),
        func.sum(LeaguePlayer.losses).label("total_losses"),
        func.max(LeaguePlayer.elo_rating).label("max_elo"),
        func.sum(LeaguePlayer.points).label("total_points"),
    ).where(LeaguePlayer.player_id == player_id)

    stats_result = await db.execute(stats_query)
    stats = stats_result.first()

    wins = stats.total_wins or 0
    losses = stats.total_losses or 0
    total_matches = wins + losses
    win_rate = (wins / total_matches * 100) if total_matches > 0 else 0

    return PlayerWithStatsResponse(
        **player.__dict__,
        total_matches=total_matches,
        wins=wins,
        losses=losses,
        win_rate=round(win_rate, 1),
        current_elo=stats.max_elo or 1500,
        current_points=stats.total_points or 0,
    )


@router.patch("/{player_id}", response_model=PlayerResponse)
async def update_player(
    player_id: uuid.UUID,
    player_update: PlayerUpdate,
    tenant: CurrentTenant,
    current_user: ManagerOrAdmin,
    db: DB,
):
    """Update a player (manager/admin only)."""
    query = select(Player).where(
        Player.id == player_id,
        Player.tenant_id == tenant.id,
    )
    result = await db.execute(query)
    player = result.scalar_one_or_none()

    if not player:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Player not found",
        )

    update_data = player_update.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(player, field, value)

    await db.flush()
    await db.refresh(player)

    return player


@router.delete("/{player_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_player(
    player_id: uuid.UUID,
    tenant: CurrentTenant,
    current_user: ManagerOrAdmin,
    db: DB,
):
    """Soft delete a player (manager/admin only)."""
    query = select(Player).where(
        Player.id == player_id,
        Player.tenant_id == tenant.id,
    )
    result = await db.execute(query)
    player = result.scalar_one_or_none()

    if not player:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Player not found",
        )

    player.is_active = False
    await db.flush()
