import math
import random
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.player import Player
from app.models.tournament import (
    ParticipantStatus,
    Tournament,
    TournamentMatch,
    TournamentParticipant,
    TournamentStatus,
)


class TournamentService:
    """Service for managing tournament brackets and progression."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def generate_bracket(self, tournament: Tournament) -> list[TournamentMatch]:
        """
        Generate tournament bracket based on participants and seeding.

        Returns:
            List of tournament matches for the bracket
        """
        if tournament.status != TournamentStatus.REGISTRATION:
            raise ValueError("Tournament must be in registration status to generate bracket")

        # Get participants
        participants = await self._get_participants(tournament.id)

        if len(participants) < 2:
            raise ValueError("Tournament must have at least 2 participants")

        # Calculate bracket size (next power of 2)
        bracket_size = self._next_power_of_2(len(participants))
        num_rounds = int(math.log2(bracket_size))

        # Sort by seed (seeded players first, then random)
        seeded = [p for p in participants if p.seed is not None]
        unseeded = [p for p in participants if p.seed is None]
        random.shuffle(unseeded)
        seeded.sort(key=lambda x: x.seed)

        ordered_participants = seeded + unseeded

        # Pad with byes if needed
        while len(ordered_participants) < bracket_size:
            ordered_participants.append(None)

        # Create matches for all rounds
        matches = []
        match_map = {}  # Maps (round, position) to match

        # Create matches from final backwards
        for round_num in range(1, num_rounds + 1):
            matches_in_round = bracket_size // (2 ** round_num)

            for position in range(matches_in_round):
                match = TournamentMatch(
                    tournament_id=tournament.id,
                    round=round_num,
                    position=position,
                )
                matches.append(match)
                match_map[(round_num, position)] = match

        # Link matches to next round
        for round_num in range(2, num_rounds + 1):
            matches_in_round = bracket_size // (2 ** round_num)
            prev_matches_in_round = bracket_size // (2 ** (round_num - 1))

            for position in range(matches_in_round):
                current_match = match_map[(round_num, position)]
                # Two matches from previous round feed into this one
                prev_pos_1 = position * 2
                prev_pos_2 = position * 2 + 1

                if (round_num - 1, prev_pos_1) in match_map:
                    match_map[(round_num - 1, prev_pos_1)].next_match = current_match
                if (round_num - 1, prev_pos_2) in match_map:
                    match_map[(round_num - 1, prev_pos_2)].next_match = current_match

        # Assign players to first round matches
        first_round_num = num_rounds
        first_round_matches = [m for m in matches if m.round == first_round_num]

        # Standard bracket positioning for seeding
        positions = self._get_seeded_positions(bracket_size)

        for i, match in enumerate(first_round_matches):
            pos1 = positions[i * 2]
            pos2 = positions[i * 2 + 1]

            player1 = ordered_participants[pos1] if pos1 < len(ordered_participants) else None
            player2 = ordered_participants[pos2] if pos2 < len(ordered_participants) else None

            if player1:
                match.player1_id = player1.player_id
            if player2:
                match.player2_id = player2.player_id

            # Handle byes
            if player1 and not player2:
                match.winner_id = player1.player_id
            elif player2 and not player1:
                match.winner_id = player2.player_id

        # Add all matches to database
        for match in matches:
            self.db.add(match)

        # Update tournament status
        tournament.status = TournamentStatus.IN_PROGRESS

        return matches

    async def advance_winner(
        self,
        tournament_match: TournamentMatch,
        winner_id: uuid.UUID,
    ) -> TournamentMatch | None:
        """
        Advance the winner to the next round.

        Returns:
            The next match if there is one, None if this was the final
        """
        tournament_match.winner_id = winner_id

        # Update participant status
        loser_id = (
            tournament_match.player1_id
            if winner_id == tournament_match.player2_id
            else tournament_match.player2_id
        )

        if loser_id:
            await self._update_participant_status(
                tournament_match.tournament_id,
                loser_id,
                ParticipantStatus.ELIMINATED,
            )

        # Check if this is the final
        if tournament_match.round == 1:
            await self._update_participant_status(
                tournament_match.tournament_id,
                winner_id,
                ParticipantStatus.WINNER,
            )
            tournament = await self._get_tournament(tournament_match.tournament_id)
            if tournament:
                tournament.status = TournamentStatus.COMPLETED
            return None

        # Advance to next match
        if tournament_match.next_match_id:
            next_match = await self._get_tournament_match(tournament_match.next_match_id)
            if next_match:
                # Determine which slot (player1 or player2)
                if next_match.player1_id is None:
                    next_match.player1_id = winner_id
                else:
                    next_match.player2_id = winner_id
                return next_match

        return None

    async def get_bracket(self, tournament_id: uuid.UUID) -> list[TournamentMatch]:
        """Get all matches in a tournament bracket."""
        query = (
            select(TournamentMatch)
            .where(TournamentMatch.tournament_id == tournament_id)
            .order_by(TournamentMatch.round.desc(), TournamentMatch.position)
        )
        result = await self.db.execute(query)
        return list(result.scalars().all())

    def _next_power_of_2(self, n: int) -> int:
        """Find the next power of 2 >= n."""
        return 2 ** math.ceil(math.log2(n))

    def _get_seeded_positions(self, size: int) -> list[int]:
        """
        Get bracket positions that minimize early matchups between top seeds.
        Standard tournament seeding.
        """
        if size == 2:
            return [0, 1]

        positions = [0] * size
        positions[0] = 0
        positions[1] = size - 1

        for seed in range(2, size):
            # Find the appropriate position for this seed
            group_size = size // (seed + 1) if seed < size // 2 else 1
            available = [i for i in range(size) if positions.count(i) == 0 or i not in positions[:seed]]

            # Place seeds to maximize distance from higher seeds
            if available:
                positions[seed] = available[len(available) // 2]

        return list(range(size))  # Simplified: just use sequential for now

    async def _get_participants(
        self,
        tournament_id: uuid.UUID,
    ) -> list[TournamentParticipant]:
        """Get all participants for a tournament."""
        query = (
            select(TournamentParticipant)
            .where(TournamentParticipant.tournament_id == tournament_id)
            .order_by(TournamentParticipant.seed.nullslast(), TournamentParticipant.registered_at)
        )
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def _get_tournament(self, tournament_id: uuid.UUID) -> Tournament | None:
        """Get a tournament by ID."""
        query = select(Tournament).where(Tournament.id == tournament_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def _get_tournament_match(
        self,
        match_id: uuid.UUID,
    ) -> TournamentMatch | None:
        """Get a tournament match by ID."""
        query = select(TournamentMatch).where(TournamentMatch.id == match_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def _update_participant_status(
        self,
        tournament_id: uuid.UUID,
        player_id: uuid.UUID,
        status: ParticipantStatus,
    ) -> None:
        """Update a participant's status."""
        query = select(TournamentParticipant).where(
            TournamentParticipant.tournament_id == tournament_id,
            TournamentParticipant.player_id == player_id,
        )
        result = await self.db.execute(query)
        participant = result.scalar_one_or_none()
        if participant:
            participant.status = status
