import math


class EloService:
    """Service for calculating ELO ratings."""

    DEFAULT_K_FACTOR = 32
    DEFAULT_RATING = 1500

    @staticmethod
    def expected_score(rating_a: int, rating_b: int) -> float:
        """
        Calculate the expected score for player A against player B.
        Returns a value between 0 and 1.
        """
        return 1 / (1 + math.pow(10, (rating_b - rating_a) / 400))

    @staticmethod
    def calculate_margin_multiplier(score: dict) -> float:
        """
        Calculate a multiplier based on the margin of victory.
        A dominant win (e.g., 6-0, 6-0) has a bigger impact than a close match.
        """
        if not score or "sets" not in score:
            return 1.0

        sets = score["sets"]
        total_games_winner = 0
        total_games_loser = 0

        for set_score in sets:
            if len(set_score) == 2:
                games = sorted(set_score, reverse=True)
                total_games_winner += games[0]
                total_games_loser += games[1]

        if total_games_winner == 0:
            return 1.0

        # Calculate margin multiplier (1.0 to 1.5)
        margin = total_games_winner - total_games_loser
        total_games = total_games_winner + total_games_loser

        if total_games == 0:
            return 1.0

        multiplier = 1.0 + (margin / total_games) * 0.5
        return min(max(multiplier, 1.0), 1.5)

    @classmethod
    def calculate_new_ratings(
        cls,
        winner_rating: int,
        loser_rating: int,
        score: dict | None = None,
        k_factor: int = DEFAULT_K_FACTOR,
    ) -> tuple[int, int]:
        """
        Calculate new ELO ratings after a match.

        Args:
            winner_rating: Current rating of the winner
            loser_rating: Current rating of the loser
            score: Match score (optional, used for margin multiplier)
            k_factor: K-factor for rating adjustment

        Returns:
            Tuple of (new_winner_rating, new_loser_rating)
        """
        expected_winner = cls.expected_score(winner_rating, loser_rating)
        expected_loser = 1 - expected_winner

        margin_multiplier = cls.calculate_margin_multiplier(score) if score else 1.0

        # Winner gets points (actual score = 1)
        winner_change = round(k_factor * margin_multiplier * (1 - expected_winner))

        # Loser loses points (actual score = 0)
        loser_change = round(k_factor * margin_multiplier * (0 - expected_loser))

        new_winner_rating = winner_rating + winner_change
        new_loser_rating = max(loser_rating + loser_change, 100)  # Minimum rating of 100

        return new_winner_rating, new_loser_rating

    @classmethod
    def calculate_points(
        cls,
        is_winner: bool,
        is_walkover: bool = False,
        gave_walkover: bool = False,
    ) -> int:
        """
        Calculate points for a player based on match result.

        Args:
            is_winner: Whether the player won
            is_walkover: Whether the match was a walkover
            gave_walkover: Whether this player gave the walkover

        Returns:
            Points earned
        """
        if gave_walkover:
            return 0
        elif is_walkover and is_winner:
            return 3  # Winner by WO
        elif is_winner:
            return 3  # Regular win
        else:
            return 1  # Participation point for loss
