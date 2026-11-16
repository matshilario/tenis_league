from datetime import timedelta

from app.core.config import settings
from app.domain.scoring import format_score
from app.models import Match, MatchStatus
from app.schemas import MatchOut, PublicUser


def match_out(m: Match) -> MatchOut:
    out = MatchOut.model_validate(m)
    out.player1 = PublicUser.model_validate(m.entry1.user) if m.entry1 else None
    out.player2 = PublicUser.model_validate(m.entry2.user) if m.entry2 else None
    if m.status in (MatchStatus.REPORTED, MatchStatus.CONFIRMED, MatchStatus.CONTESTED):
        out.score_text = format_score(m.score, m.result_type or "normal")
    elif m.status == MatchStatus.BYE:
        out.score_text = "folga"
    if m.status == MatchStatus.REPORTED and m.reported_at:
        out.contest_deadline = m.reported_at + timedelta(hours=settings.CONTEST_WINDOW_HOURS)
    return out
