import uuid
from typing import List

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import or_, select

from app.api.deps import CurrentTenant, CurrentUser, DB
from app.models.player import Player
from app.models.schedule import ResponseStatus, Schedule, ScheduleStatus
from app.models.user import User
from app.schemas.schedule import (
    ScheduleCreate,
    ScheduleRespondRequest,
    ScheduleResponse,
    ScheduleUpdate,
    ScheduleWithPlayersResponse,
)

router = APIRouter()


@router.post("/", response_model=ScheduleResponse, status_code=status.HTTP_201_CREATED)
async def create_schedule(
    schedule_in: ScheduleCreate,
    tenant: CurrentTenant,
    current_user: CurrentUser,
    db: DB,
):
    """Propose a match schedule."""
    # Verify both players exist
    players_query = select(Player).where(
        Player.id.in_([schedule_in.player1_id, schedule_in.player2_id]),
        Player.tenant_id == tenant.id,
    )
    players_result = await db.execute(players_query)
    players = list(players_result.scalars().all())

    if len(players) != 2:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="One or both players not found",
        )

    schedule = Schedule(
        tenant_id=tenant.id,
        league_id=schedule_in.league_id,
        player1_id=schedule_in.player1_id,
        player2_id=schedule_in.player2_id,
        proposed_by=current_user.id,
        proposed_datetime=schedule_in.proposed_datetime,
        location=schedule_in.location,
        notes=schedule_in.notes,
    )

    # Auto-accept for the proposer if they are one of the players
    player_query = select(Player).where(Player.user_id == current_user.id)
    player_result = await db.execute(player_query)
    user_player = player_result.scalar_one_or_none()

    if user_player:
        if user_player.id == schedule_in.player1_id:
            schedule.player1_response = ResponseStatus.ACCEPTED
        elif user_player.id == schedule_in.player2_id:
            schedule.player2_response = ResponseStatus.ACCEPTED

    db.add(schedule)
    await db.flush()
    await db.refresh(schedule)

    return schedule


@router.get("/", response_model=List[ScheduleWithPlayersResponse])
async def list_schedules(
    tenant: CurrentTenant,
    current_user: CurrentUser,
    db: DB,
    player_id: uuid.UUID | None = None,
    status_filter: ScheduleStatus | None = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
):
    """List schedules with optional filters."""
    query = select(Schedule).where(Schedule.tenant_id == tenant.id)

    if player_id:
        query = query.where(
            or_(Schedule.player1_id == player_id, Schedule.player2_id == player_id)
        )

    if status_filter:
        query = query.where(Schedule.status == status_filter)

    query = query.offset(skip).limit(limit).order_by(Schedule.proposed_datetime.desc())

    result = await db.execute(query)
    schedules = list(result.scalars().all())

    # Get player and proposer names
    response = []
    for schedule in schedules:
        p1_query = select(Player).where(Player.id == schedule.player1_id)
        p2_query = select(Player).where(Player.id == schedule.player2_id)
        proposer_query = select(User).where(User.id == schedule.proposed_by)

        p1_result = await db.execute(p1_query)
        p2_result = await db.execute(p2_query)
        proposer_result = await db.execute(proposer_query)

        player1 = p1_result.scalar_one()
        player2 = p2_result.scalar_one()
        proposer = proposer_result.scalar_one()

        response.append(
            ScheduleWithPlayersResponse(
                **schedule.__dict__,
                player1_name=player1.name,
                player2_name=player2.name,
                proposer_name=proposer.full_name,
            )
        )

    return response


@router.get("/{schedule_id}", response_model=ScheduleWithPlayersResponse)
async def get_schedule(
    schedule_id: uuid.UUID,
    tenant: CurrentTenant,
    current_user: CurrentUser,
    db: DB,
):
    """Get a schedule by ID."""
    query = select(Schedule).where(
        Schedule.id == schedule_id,
        Schedule.tenant_id == tenant.id,
    )
    result = await db.execute(query)
    schedule = result.scalar_one_or_none()

    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Schedule not found",
        )

    # Get player and proposer names
    p1_query = select(Player).where(Player.id == schedule.player1_id)
    p2_query = select(Player).where(Player.id == schedule.player2_id)
    proposer_query = select(User).where(User.id == schedule.proposed_by)

    p1_result = await db.execute(p1_query)
    p2_result = await db.execute(p2_query)
    proposer_result = await db.execute(proposer_query)

    player1 = p1_result.scalar_one()
    player2 = p2_result.scalar_one()
    proposer = proposer_result.scalar_one()

    return ScheduleWithPlayersResponse(
        **schedule.__dict__,
        player1_name=player1.name,
        player2_name=player2.name,
        proposer_name=proposer.full_name,
    )


@router.post("/{schedule_id}/respond", response_model=ScheduleResponse)
async def respond_to_schedule(
    schedule_id: uuid.UUID,
    response_data: ScheduleRespondRequest,
    tenant: CurrentTenant,
    current_user: CurrentUser,
    db: DB,
):
    """Respond to a schedule proposal (accept/reject)."""
    query = select(Schedule).where(
        Schedule.id == schedule_id,
        Schedule.tenant_id == tenant.id,
    )
    result = await db.execute(query)
    schedule = result.scalar_one_or_none()

    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Schedule not found",
        )

    if schedule.status != ScheduleStatus.PROPOSED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Schedule is no longer in proposed status",
        )

    # Get player linked to user
    player_query = select(Player).where(Player.user_id == current_user.id)
    player_result = await db.execute(player_query)
    user_player = player_result.scalar_one_or_none()

    if not user_player:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be a player to respond to schedules",
        )

    is_player1 = user_player.id == schedule.player1_id
    is_player2 = user_player.id == schedule.player2_id

    if not is_player1 and not is_player2:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a participant in this schedule",
        )

    # Update response
    if is_player1:
        schedule.player1_response = response_data.response
    elif is_player2:
        schedule.player2_response = response_data.response

    # Check if both have responded
    if schedule.player1_response == ResponseStatus.REJECTED or schedule.player2_response == ResponseStatus.REJECTED:
        schedule.status = ScheduleStatus.REJECTED
    elif schedule.player1_response == ResponseStatus.ACCEPTED and schedule.player2_response == ResponseStatus.ACCEPTED:
        schedule.status = ScheduleStatus.ACCEPTED

    await db.flush()
    await db.refresh(schedule)

    return schedule


@router.patch("/{schedule_id}", response_model=ScheduleResponse)
async def update_schedule(
    schedule_id: uuid.UUID,
    schedule_update: ScheduleUpdate,
    tenant: CurrentTenant,
    current_user: CurrentUser,
    db: DB,
):
    """Update a schedule (proposer only)."""
    query = select(Schedule).where(
        Schedule.id == schedule_id,
        Schedule.tenant_id == tenant.id,
    )
    result = await db.execute(query)
    schedule = result.scalar_one_or_none()

    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Schedule not found",
        )

    if schedule.proposed_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the proposer can update this schedule",
        )

    update_data = schedule_update.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(schedule, field, value)

    await db.flush()
    await db.refresh(schedule)

    return schedule


@router.delete("/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_schedule(
    schedule_id: uuid.UUID,
    tenant: CurrentTenant,
    current_user: CurrentUser,
    db: DB,
):
    """Cancel a schedule."""
    query = select(Schedule).where(
        Schedule.id == schedule_id,
        Schedule.tenant_id == tenant.id,
    )
    result = await db.execute(query)
    schedule = result.scalar_one_or_none()

    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Schedule not found",
        )

    schedule.status = ScheduleStatus.CANCELLED
    await db.flush()
