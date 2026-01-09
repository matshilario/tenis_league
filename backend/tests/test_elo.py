import pytest
from app.services.elo_service import EloService


class TestEloService:
    def test_expected_score_equal_ratings(self):
        """Players with equal ratings should have 50% expected score."""
        expected = EloService.expected_score(1500, 1500)
        assert expected == 0.5

    def test_expected_score_higher_rating(self):
        """Higher rated player should have > 50% expected score."""
        expected = EloService.expected_score(1600, 1400)
        assert expected > 0.5
        assert expected < 1.0

    def test_expected_score_lower_rating(self):
        """Lower rated player should have < 50% expected score."""
        expected = EloService.expected_score(1400, 1600)
        assert expected < 0.5
        assert expected > 0.0

    def test_calculate_new_ratings_equal_ratings(self):
        """Test rating changes when players have equal ratings."""
        new_winner, new_loser = EloService.calculate_new_ratings(1500, 1500)

        assert new_winner > 1500  # Winner gains
        assert new_loser < 1500   # Loser loses
        assert new_winner - 1500 == 1500 - new_loser  # Symmetric change

    def test_calculate_new_ratings_upset(self):
        """Lower rated player beating higher rated should gain more."""
        # Lower rated wins (upset)
        new_winner, new_loser = EloService.calculate_new_ratings(1400, 1600)

        # Winner should gain significant points
        assert new_winner > 1400 + 16  # More than half K-factor

    def test_calculate_new_ratings_expected_win(self):
        """Higher rated player winning should gain fewer points."""
        new_winner, new_loser = EloService.calculate_new_ratings(1600, 1400)

        # Winner gains fewer points for expected win
        assert new_winner - 1600 < 16  # Less than half K-factor

    def test_minimum_rating(self):
        """Rating should never go below 100."""
        new_winner, new_loser = EloService.calculate_new_ratings(200, 100)

        assert new_loser >= 100

    def test_margin_multiplier_dominant_win(self):
        """Dominant win should have higher multiplier."""
        score_dominant = {"sets": [[6, 0], [6, 0]]}
        score_close = {"sets": [[7, 6], [6, 7], [7, 6]]}

        mult_dominant = EloService.calculate_margin_multiplier(score_dominant)
        mult_close = EloService.calculate_margin_multiplier(score_close)

        assert mult_dominant > mult_close
        assert mult_dominant <= 1.5
        assert mult_close >= 1.0

    def test_points_calculation_win(self):
        """Winner should get 3 points."""
        points = EloService.calculate_points(is_winner=True)
        assert points == 3

    def test_points_calculation_loss(self):
        """Loser should get 1 participation point."""
        points = EloService.calculate_points(is_winner=False)
        assert points == 1

    def test_points_calculation_walkover_given(self):
        """Player giving walkover should get 0 points."""
        points = EloService.calculate_points(is_winner=False, is_walkover=True, gave_walkover=True)
        assert points == 0

    def test_points_calculation_walkover_received(self):
        """Player receiving walkover (winner) should get 3 points."""
        points = EloService.calculate_points(is_winner=True, is_walkover=True)
        assert points == 3
