import uuid
from typing import List

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select

from app.api.deps import CurrentTenant, CurrentUser, DB, ManagerOrAdmin
from app.models.player import Player
from app.models.tournament import (
    Tournament,
    TournamentMatch,
    TournamentParticipant,
    TournamentStatus,
)
from app.schemas.tournament import (
    RegisterParticipantRequest,
    TournamentBracketResponse,
    TournamentCreate,
    TournamentMatchResponse,
    TournamentParticipantResponse,
    TournamentResponse,
    TournamentUpdate,
)
from app.services.tournament_service import TournamentService

router = APIRouter()


@router.post("/", response_model=TournamentResponse, status_code=status.HTTP_201_CREATED)
async def create_tournament(
    tournament_in: TournamentCreate,
    tenant: CurrentTenant,
    current_user: ManagerOrAdmin,
    db: DB,
):
    """Create a new tournament (manager/admin only)."""
    tournament = Tournament(
        tenant_id=tenant.id,
        league_id=tournament_in.league_id,
        name=tournament_in.name,
        description=tournament_in.description,
        format=tournament_in.format,
        size=tournament_in.size,
        registration_deadline=tournament_in.registration_deadline,
        start_date=tournament_in.start_date,
        end_date=tournament_in.end_date,
    )
    db.add(tournament)
    await db.flush()
    await db.refresh(tournament)

    return tournament


@router.get("/", response_model=List[TournamentResponse])
async def list_tournaments(
    tenant: CurrentTenant,
    current_user: CurrentUser,
    db: DB,
    league_id: uuid.UUID | None = None,
    status_filter: TournamentStatus | None = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
):
    """List all tournaments."""
    query = select(Tournament).where(Tournament.tenant_id == tenant.id)

    if league_id:
        query = query.where(Tournament.league_id == league_id)

    if status_filter:
        query = query.where(Tournament.status == status_filter)

    query = query.offset(skip).limit(limit).order_by(Tournament.created_at.desc())

    result = await db.execute(query)
    return list(result.scalars().all())


@router.get("/{tournament_id}", response_model=TournamentResponse)
async def get_tournament(
    tournament_id: uuid.UUID,
    tenant: CurrentTenant,
    current_user: CurrentUser,
    db: DB,
):
    """Get a tournament by ID."""
    query = select(Tournament).where(
        Tournament.id == tournament_id,
        Tournament.tenant_id == tenant.id,
    )
    result = await db.execute(query)
    tournament = result.scalar_one_or_none()

    if not tournament:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tournament not found",
        )

    return tournament


@router.patch("/{tournament_id}", response_model=TournamentResponse)
async def update_tournament(
    tournament_id: uuid.UUID,
    tournament_update: TournamentUpdate,
    tenant: CurrentTenant,
    current_user: ManagerOrAdmin,
    db: DB,
):
    """Update a tournament (manager/admin only)."""
    query = select(Tournament).where(
        Tournament.id == tournament_id,
        Tournament.tenant_id == tenant.id,
    )
    result = await db.execute(query)
    tournament = result.scalar_one_or_none()

    if not tournament:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tournament not found",
        )

    update_data = tournament_update.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(tournament, field, value)

    await db.flush()
    await db.refresh(tournament)

    return tournament


@router.post("/{tournament_id}/participants", response_model=TournamentParticipantResponse)
async def register_participant(
    tournament_id: uuid.UUID,
    request: RegisterParticipantRequest,
    tenant: CurrentTenant,
    current_user: CurrentUser,
    db: DB,
):
    """Register a player for a tournament."""
    # Verify tournament exists and is in registration
    tournament_query = select(Tournament).where(
        Tournament.id == tournament_id,
        Tournament.tenant_id == tenant.id,
    )
    tournament_result = await db.execute(tournament_query)
    tournament = tournament_result.scalar_one_or_none()

    if not tournament:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tournament not found",
        )

    if tournament.status not in [TournamentStatus.DRAFT, TournamentStatus.REGISTRATION]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tournament is not accepting registrations",
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

    # Check if player is already registered
    existing_query = select(TournamentParticipant).where(
        TournamentParticipant.tournament_id == tournament_id,
        TournamentParticipant.player_id == request.player_id,
    )
    existing_result = await db.execute(existing_query)
    existing = existing_result.scalar_one_or_none()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Player is already registered",
        )

    # Check tournament capacity
    count_query = select(TournamentParticipant).where(
        TournamentParticipant.tournament_id == tournament_id
    )
    count_result = await db.execute(count_query)
    current_count = len(list(count_result.scalars().all()))

    if current_count >= tournament.size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tournament is full",
        )

    # Register participant
    participant = TournamentParticipant(
        tournament_id=tournament_id,
        player_id=request.player_id,
        seed=request.seed,
    )
    db.add(participant)
    await db.flush()
    await db.refresh(participant)

    # Update tournament status if first registration
    if tournament.status == TournamentStatus.DRAFT:
        tournament.status = TournamentStatus.REGISTRATION

    return TournamentParticipantResponse(
        id=participant.id,
        tournament_id=participant.tournament_id,
        player_id=participant.player_id,
        player_name=player.name,
        seed=participant.seed,
        status=participant.status,
        registered_at=participant.registered_at,
    )


@router.get("/{tournament_id}/participants", response_model=List[TournamentParticipantResponse])
async def list_participants(
    tournament_id: uuid.UUID,
    tenant: CurrentTenant,
    current_user: CurrentUser,
    db: DB,
):
    """List all participants in a tournament."""
    query = (
        select(TournamentParticipant, Player)
        .join(Player, TournamentParticipant.player_id == Player.id)
        .where(TournamentParticipant.tournament_id == tournament_id)
        .order_by(TournamentParticipant.seed.nullslast(), TournamentParticipant.registered_at)
    )

    result = await db.execute(query)
    rows = result.all()

    return [
        TournamentParticipantResponse(
            id=participant.id,
            tournament_id=participant.tournament_id,
            player_id=participant.player_id,
            player_name=player.name,
            seed=participant.seed,
            status=participant.status,
            registered_at=participant.registered_at,
        )
        for participant, player in rows
    ]


@router.post("/{tournament_id}/generate-bracket", response_model=List[TournamentMatchResponse])
async def generate_bracket(
    tournament_id: uuid.UUID,
    tenant: CurrentTenant,
    current_user: ManagerOrAdmin,
    db: DB,
):
    """Generate tournament bracket (manager/admin only)."""
    query = select(Tournament).where(
        Tournament.id == tournament_id,
        Tournament.tenant_id == tenant.id,
    )
    result = await db.execute(query)
    tournament = result.scalar_one_or_none()

    if not tournament:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tournament not found",
        )

    tournament_service = TournamentService(db)

    try:
        matches = await tournament_service.generate_bracket(tournament)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    await db.flush()

    # Build response with player names
    response = []
    for match in matches:
        player1_name = None
        player2_name = None
        winner_name = None

        if match.player1_id:
            p1_query = select(Player).where(Player.id == match.player1_id)
            p1_result = await db.execute(p1_query)
            p1 = p1_result.scalar_one_or_none()
            player1_name = p1.name if p1 else None

        if match.player2_id:
            p2_query = select(Player).where(Player.id == match.player2_id)
            p2_result = await db.execute(p2_query)
            p2 = p2_result.scalar_one_or_none()
            player2_name = p2.name if p2 else None

        if match.winner_id:
            winner_name = player1_name if match.winner_id == match.player1_id else player2_name

        response.append(
            TournamentMatchResponse(
                id=match.id,
                tournament_id=match.tournament_id,
                match_id=match.match_id,
                round=match.round,
                position=match.position,
                player1_id=match.player1_id,
                player1_name=player1_name,
                player2_id=match.player2_id,
                player2_name=player2_name,
                winner_id=match.winner_id,
                winner_name=winner_name,
                next_match_id=match.next_match_id,
            )
        )

    return response


@router.get("/{tournament_id}/bracket", response_model=TournamentBracketResponse)
async def get_bracket(
    tournament_id: uuid.UUID,
    tenant: CurrentTenant,
    current_user: CurrentUser,
    db: DB,
):
    """Get the full tournament bracket."""
    # Get tournament
    tournament_query = select(Tournament).where(
        Tournament.id == tournament_id,
        Tournament.tenant_id == tenant.id,
    )
    tournament_result = await db.execute(tournament_query)
    tournament = tournament_result.scalar_one_or_none()

    if not tournament:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tournament not found",
        )

    # Get participants
    participants_query = (
        select(TournamentParticipant, Player)
        .join(Player, TournamentParticipant.player_id == Player.id)
        .where(TournamentParticipant.tournament_id == tournament_id)
    )
    participants_result = await db.execute(participants_query)
    participants_rows = participants_result.all()

    participants = [
        TournamentParticipantResponse(
            id=p.id,
            tournament_id=p.tournament_id,
            player_id=p.player_id,
            player_name=player.name,
            seed=p.seed,
            status=p.status,
            registered_at=p.registered_at,
        )
        for p, player in participants_rows
    ]

    # Get matches
    tournament_service = TournamentService(db)
    matches_db = await tournament_service.get_bracket(tournament_id)

    matches = []
    for match in matches_db:
        player1_name = None
        player2_name = None
        winner_name = None

        if match.player1_id:
            p1_query = select(Player).where(Player.id == match.player1_id)
            p1_result = await db.execute(p1_query)
            p1 = p1_result.scalar_one_or_none()
            player1_name = p1.name if p1 else None

        if match.player2_id:
            p2_query = select(Player).where(Player.id == match.player2_id)
            p2_result = await db.execute(p2_query)
            p2 = p2_result.scalar_one_or_none()
            player2_name = p2.name if p2 else None

        if match.winner_id:
            winner_name = player1_name if match.winner_id == match.player1_id else player2_name

        matches.append(
            TournamentMatchResponse(
                id=match.id,
                tournament_id=match.tournament_id,
                match_id=match.match_id,
                round=match.round,
                position=match.position,
                player1_id=match.player1_id,
                player1_name=player1_name,
                player2_id=match.player2_id,
                player2_name=player2_name,
                winner_id=match.winner_id,
                winner_name=winner_name,
                next_match_id=match.next_match_id,
            )
        )

    # Calculate rounds
    rounds = max([m.round for m in matches]) if matches else 0

    return TournamentBracketResponse(
        tournament=TournamentResponse.model_validate(tournament),
        participants=participants,
        matches=matches,
        rounds=rounds,
    )
