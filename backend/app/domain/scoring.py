"""Placar e pontuação — regulamento §4, §5 e §8.

Formato do placar (sempre na perspectiva jogador1 × jogador2):

    {
        "sets": [[6, 4], [3, 6]],          # sets regulares (no máximo 2)
        "tiebreaks": [None, None],          # pontos do tie-break em sets 7/6 (opcional, informativo)
        "super_tiebreak": [10, 8] | None,   # obrigatório quando os sets ficam 1 × 1
        "stb_awarded": False,               # super tie-break atribuído sem ser jogado (abandono)
    }

Tipos de resultado:
    normal          partida disputada até o fim
    walkover        W.O. simples: registrado como 6/0 6/0 para o vencedor
    double_walkover os dois responsabilizados: zero ponto e uma ocorrência de W.O. para cada
    retired         abandono: placar parcial completado a favor do vencedor (§8)
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum

POINTS_WIN = 10
POINTS_PER_SET = 3
POINTS_PER_GAME = 1


class ResultType(str, Enum):
    NORMAL = "normal"
    WALKOVER = "walkover"
    DOUBLE_WALKOVER = "double_walkover"
    RETIRED = "retired"


class ScoreError(ValueError):
    """Placar inválido; a mensagem é exibida ao usuário."""


# --------------------------------------------------------------------------- sets


def _is_finished_set(a: int, b: int) -> bool:
    hi, lo = max(a, b), min(a, b)
    return (hi == 6 and lo <= 4) or (hi == 7 and lo in (5, 6))


def _validate_finished_set(s: list[int], n: int) -> int:
    """Valida um set encerrado; devolve o lado vencedor (1 ou 2)."""
    if len(s) != 2 or any((not isinstance(g, int)) or g < 0 for g in s):
        raise ScoreError(f"Set {n}: informe os games dos dois jogadores.")
    a, b = s
    if not _is_finished_set(a, b):
        raise ScoreError(
            f"Set {n}: {a}/{b} não é um placar final válido "
            "(6 games com 2 de diferença, 7/5 ou 7/6)."
        )
    return 1 if a > b else 2


def _validate_tiebreak(tb: list[int] | None, set_score: list[int], n: int) -> None:
    if tb is None:
        return
    if sorted(set_score) != [6, 7]:
        raise ScoreError(f"Set {n}: tie-break só existe em sets 7/6.")
    _validate_race(tb, 7, f"Tie-break do set {n}")
    if (tb[0] > tb[1]) != (set_score[0] > set_score[1]):
        raise ScoreError(f"Set {n}: o vencedor do tie-break deve ser o vencedor do set.")


def _validate_race(pts: list[int], target: int, label: str) -> int:
    """Disputa 'até N com 2 de diferença' (tie-break ou super tie-break)."""
    if len(pts) != 2 or any((not isinstance(p, int)) or p < 0 for p in pts):
        raise ScoreError(f"{label}: informe os pontos dos dois jogadores.")
    hi, lo = max(pts), min(pts)
    ok = hi >= target and hi - lo >= 2 and (hi == target or hi - lo == 2)
    if not ok:
        raise ScoreError(
            f"{label}: {pts[0]}/{pts[1]} inválido (até {target}, 2 pontos de diferença)."
        )
    return 1 if pts[0] > pts[1] else 2


def normalize_score(score: dict | None) -> dict:
    score = dict(score or {})
    sets = [list(s) for s in score.get("sets") or []]
    tbs = list(score.get("tiebreaks") or [])
    tbs = (tbs + [None] * len(sets))[: len(sets)]
    stb = score.get("super_tiebreak")
    return {
        "sets": sets,
        "tiebreaks": [list(t) if t else None for t in tbs],
        "super_tiebreak": list(stb) if stb else None,
        "stb_awarded": bool(score.get("stb_awarded", False)),
    }


def validate_score(score: dict) -> int:
    """Valida o placar de uma partida completa. Devolve o lado vencedor (1 ou 2)."""
    sc = normalize_score(score)
    sets = sc["sets"]
    if len(sets) != 2:
        raise ScoreError("A partida tem exatamente 2 sets regulares (+ super tie-break se 1×1).")
    winners = []
    for i, s in enumerate(sets, 1):
        winners.append(_validate_finished_set(s, i))
        _validate_tiebreak(sc["tiebreaks"][i - 1], s, i)

    if winners[0] == winners[1]:
        if sc["super_tiebreak"] or sc["stb_awarded"]:
            raise ScoreError("Não há super tie-break quando um jogador vence os dois sets.")
        return winners[0]

    if sc["stb_awarded"]:
        raise ScoreError("Super tie-break atribuído só existe em abandono.")
    if not sc["super_tiebreak"]:
        raise ScoreError("Sets 1×1: informe o placar do super tie-break.")
    return _validate_race(sc["super_tiebreak"], 10, "Super tie-break")


# --------------------------------------------------------------------- abandono


def complete_retirement(partial: dict, winner_side: int) -> dict:
    """Completa o placar de uma partida abandonada (§8).

    Preserva games e sets já conquistados e completa com os games necessários para
    encerrar a partida, sem novas concessões ao desistente. Se ficar 1×1, atribui o
    super tie-break ao vencedor (um set, zero games).
    """
    if winner_side not in (1, 2):
        raise ScoreError("Informe quem venceu (quem NÃO abandonou).")
    sc = normalize_score(partial)
    w, l = winner_side - 1, 2 - winner_side  # índices
    sets: list[list[int]] = []
    tbs: list[list[int] | None] = []

    for i, s in enumerate(sc["sets"], 1):
        if len(sets) == 2:
            raise ScoreError("No máximo 2 sets regulares.")
        if len(s) != 2 or any(g < 0 for g in s):
            raise ScoreError(f"Set {i}: informe os games dos dois jogadores.")
        if _is_finished_set(*s):
            sets.append(list(s))
            tbs.append(sc["tiebreaks"][i - 1])
            continue
        # set em andamento: precisa ser o último informado
        if i != len(sc["sets"]):
            raise ScoreError(f"Set {i} está incompleto; só o último set pode estar em andamento.")
        if max(s) > 6:
            raise ScoreError(f"Set {i}: {s[0]}/{s[1]} impossível.")
        s = list(s)
        gl = s[l]
        s[w] = 6 if gl <= 4 else 7
        sets.append(s)
        tbs.append(None)

    def set_wins() -> tuple[int, int]:
        p1 = sum(1 for a, b in sets if a > b)
        return p1, len(sets) - p1

    stb = sc["super_tiebreak"]
    stb_awarded = False
    while True:
        p1, p2 = set_wins()
        mine = p1 if winner_side == 1 else p2
        theirs = p2 if winner_side == 1 else p1
        if mine == 2:
            stb = None
            break
        if len(sets) == 2 and mine == 1 and theirs == 1:
            stb_awarded = True
            stb = None
            break
        if len(sets) == 2:  # perdedor venceu os dois sets: não pode ter abandonado
            raise ScoreError("O desistente já havia vencido a partida; não é abandono.")
        new = [0, 0]
        new[w] = 6
        sets.append(new)
        tbs.append(None)

    return {"sets": sets, "tiebreaks": tbs, "super_tiebreak": stb, "stb_awarded": stb_awarded}


def walkover_score(winner_side: int) -> dict:
    s = [6, 0] if winner_side == 1 else [0, 6]
    return {"sets": [list(s), list(s)], "tiebreaks": [None, None], "super_tiebreak": None,
            "stb_awarded": False}


# ------------------------------------------------------------------- estatística


@dataclass
class StatLine:
    played: int = 0
    wins: int = 0
    losses: int = 0
    sets_won: int = 0
    sets_lost: int = 0
    games_won: int = 0
    games_lost: int = 0
    wo_losses: int = 0
    points: int = 0
    form: list[str] = field(default_factory=list)  # "V"/"D"/"W" (W.O. sofrido)

    def add(self, o: "StatLine") -> None:
        for k in ("played", "wins", "losses", "sets_won", "sets_lost", "games_won",
                  "games_lost", "wo_losses", "points"):
            setattr(self, k, getattr(self, k) + getattr(o, k))
        self.form.extend(o.form)

    @property
    def set_diff(self) -> int:
        return self.sets_won - self.sets_lost

    @property
    def game_diff(self) -> int:
        return self.games_won - self.games_lost


def match_stats(result_type: str, score: dict | None, winner_side: int | None
                ) -> tuple[StatLine, StatLine]:
    """Estatística e pontos de cada lado numa partida da fase classificatória."""
    rt = ResultType(result_type)
    a, b = StatLine(played=1), StatLine(played=1)

    if rt == ResultType.DOUBLE_WALKOVER:
        a.wo_losses = b.wo_losses = 1
        a.form.append("W")
        b.form.append("W")
        return a, b

    if rt == ResultType.WALKOVER:
        score = walkover_score(winner_side)  # type: ignore[arg-type]

    sc = normalize_score(score)
    for g1, g2 in sc["sets"]:
        a.games_won += g1
        a.games_lost += g2
        b.games_won += g2
        b.games_lost += g1
        if g1 > g2:
            a.sets_won += 1
            b.sets_lost += 1
        else:
            b.sets_won += 1
            a.sets_lost += 1

    if sc["super_tiebreak"] or sc["stb_awarded"]:
        # o super tie-break vale um set e zero games
        if winner_side == 1:
            a.sets_won += 1
            b.sets_lost += 1
        else:
            b.sets_won += 1
            a.sets_lost += 1

    win, lose = (a, b) if winner_side == 1 else (b, a)
    win.wins = 1
    lose.losses = 1
    win.form.append("V")
    if rt == ResultType.WALKOVER:
        lose.wo_losses = 1
        lose.form.append("W")
    else:
        lose.form.append("D")

    for s in (a, b):
        s.points = POINTS_PER_SET * s.sets_won + POINTS_PER_GAME * s.games_won
    win.points += POINTS_WIN
    if rt == ResultType.WALKOVER:
        lose.points = 0
    return a, b


def resolve_result(result_type: str, score: dict | None, winner_side: int | None
                   ) -> tuple[dict | None, int | None]:
    """Valida/normaliza um resultado informado. Devolve (placar final, lado vencedor)."""
    rt = ResultType(result_type)
    if rt == ResultType.DOUBLE_WALKOVER:
        return None, None
    if rt == ResultType.WALKOVER:
        if winner_side not in (1, 2):
            raise ScoreError("W.O.: informe quem venceu.")
        return walkover_score(winner_side), winner_side
    if rt == ResultType.RETIRED:
        final = complete_retirement(score or {}, winner_side)  # type: ignore[arg-type]
        return final, winner_side
    side = validate_score(score or {})
    if winner_side is not None and winner_side != side:
        raise ScoreError("O vencedor informado não confere com o placar.")
    return normalize_score(score), side


def format_score(score: dict | None, result_type: str = "normal") -> str:
    if result_type == ResultType.DOUBLE_WALKOVER.value:
        return "W.O. duplo"
    if not score:
        return "—"
    sc = normalize_score(score)
    parts = []
    for (a, b), tb in zip(sc["sets"], sc["tiebreaks"]):
        txt = f"{a}/{b}"
        if tb:
            txt += f"({min(tb)})"
        parts.append(txt)
    if sc["super_tiebreak"]:
        parts.append("[{}/{}]".format(*sc["super_tiebreak"]))
    elif sc["stb_awarded"]:
        parts.append("[STB atribuído]")
    out = " ".join(parts)
    if result_type == ResultType.WALKOVER.value:
        out = "W.O. (" + out + ")"
    elif result_type == ResultType.RETIRED.value:
        out += " (abandono)"
    return out
