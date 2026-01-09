import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.league import League, LeaguePlayer, RankingSystem
from app.models.match import Match, MatchStatus
from app.models.player import Player
from app.models.ranking import RankingHistory
from app.services.elo_service import EloService


class RankingService:
    """Service for managing rankings and updating player stats."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.elo_service = EloService()

    async def update_rankings_after_match(
        self,
        match: Match,
        league: League,
    ) -> tuple[RankingHistory, RankingHistory]:
        """
        Update player rankings after a confirmed match.

        Returns:
            Tuple of ranking history entries for both players
        """
        if match.status != MatchStatus.CONFIRMED or not match.winner_id:
            raise ValueError("Match must be confirmed with a winner")

        # Get league player records
        player1_league = await self._get_league_player(league.id, match.player1_id)
        player2_league = await self._get_league_player(league.id, match.player2_id)

        if not player1_league or not player2_league:
            raise ValueError("Both players must be registered in the league")

        # Determine winner and loser
        is_player1_winner = match.winner_id == match.player1_id
        winner_league = player1_league if is_player1_winner else player2_league
        loser_league = player2_league if is_player1_winner else player1_league

        # Store old ratings
        winner_old_elo = winner_league.elo_rating
        winner_old_points = winner_league.points
        loser_old_elo = loser_league.elo_rating
        loser_old_points = loser_league.points

        # Calculate new ratings based on ranking system
        if league.ranking_system == RankingSystem.ELO:
            new_winner_elo, new_loser_elo = self.elo_service.calculate_new_ratings(
                winner_league.elo_rating,
                loser_league.elo_rating,
                match.score,
            )
            winner_league.elo_rating = new_winner_elo
            loser_league.elo_rating = new_loser_elo

        # Calculate points (both systems track points)
        winner_points = self.elo_service.calculate_points(
            is_winner=True,
            is_walkover=match.is_walkover,
            gave_walkover=False,
        )
        loser_points = self.elo_service.calculate_points(
            is_winner=False,
            is_walkover=match.is_walkover,
            gave_walkover=match.walkover_player_id == loser_league.player_id,
        )

        winner_league.points += winner_points
        loser_league.points += loser_points

        # Update win/loss counts
        winner_league.wins += 1
        loser_league.losses += 1

        # Create ranking history entries
        winner_history = RankingHistory(
            tenant_id=match.tenant_id,
            league_id=league.id,
            player_id=winner_league.player_id,
            match_id=match.id,
            rating_before=winner_old_elo,
            rating_after=winner_league.elo_rating,
            points_before=winner_old_points,
            points_after=winner_league.points,
        )

        loser_history = RankingHistory(
            tenant_id=match.tenant_id,
            league_id=league.id,
            player_id=loser_league.player_id,
            match_id=match.id,
            rating_before=loser_old_elo,
            rating_after=loser_league.elo_rating,
            points_before=loser_old_points,
            points_after=loser_league.points,
        )

        self.db.add(winner_history)
        self.db.add(loser_history)

        return winner_history, loser_history

    async def get_league_ranking(
        self,
        league_id: uuid.UUID,
        ranking_system: RankingSystem,
    ) -> list[dict]:
        """
        Get the current ranking for a league.

        Returns:
            List of players sorted by ranking
        """
        query = (
            select(LeaguePlayer, Player)
            .join(Player, LeaguePlayer.player_id == Player.id)
            .where(LeaguePlayer.league_id == league_id)
        )

        if ranking_system == RankingSystem.ELO:
            query = query.order_by(LeaguePlayer.elo_rating.desc())
        else:
            query = query.order_by(
                LeaguePlayer.points.desc(),
                LeaguePlayer.wins.desc(),
            )

        result = await self.db.execute(query)
        rows = result.all()

        ranking = []
        for position, (league_player, player) in enumerate(rows, 1):
            total_matches = league_player.wins + league_player.losses
            win_rate = (
                league_player.wins / total_matches * 100 if total_matches > 0 else 0
            )

            ranking.append({
                "position": position,
                "player_id": player.id,
                "player_name": player.name,
                "elo_rating": league_player.elo_rating,
                "points": league_player.points,
                "wins": league_player.wins,
                "losses": league_player.losses,
                "win_rate": round(win_rate, 1),
            })

        return ranking

    async def get_head_to_head(
        self,
        tenant_id: uuid.UUID,
        player1_id: uuid.UUID,
        player2_id: uuid.UUID,
    ) -> dict:
        """
        Get head-to-head statistics between two players.
        """
        query = select(Match, Player).where(
            Match.tenant_id == tenant_id,
            Match.status == MatchStatus.CONFIRMED,
            (
                ((Match.player1_id == player1_id) & (Match.player2_id == player2_id))
                | ((Match.player1_id == player2_id) & (Match.player2_id == player1_id))
            ),
        ).order_by(Match.played_at.desc())

        result = await self.db.execute(query)
        matches = result.all()

        player1_wins = 0
        player2_wins = 0
        match_history = []

        for match, _ in matches:
            if match.winner_id == player1_id:
                player1_wins += 1
            elif match.winner_id == player2_id:
                player2_wins += 1

            match_history.append({
                "match_id": str(match.id),
                "winner_id": str(match.winner_id) if match.winner_id else None,
                "score": match.score,
                "played_at": match.played_at.isoformat() if match.played_at else None,
            })

        return {
            "player1_id": player1_id,
            "player2_id": player2_id,
            "player1_wins": player1_wins,
            "player2_wins": player2_wins,
            "total_matches": len(matches),
            "matches": match_history,
        }

    async def _get_league_player(
        self,
        league_id: uuid.UUID,
        player_id: uuid.UUID,
    ) -> LeaguePlayer | None:
        """Get a player's league record."""
        query = select(LeaguePlayer).where(
            LeaguePlayer.league_id == league_id,
            LeaguePlayer.player_id == player_id,
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
