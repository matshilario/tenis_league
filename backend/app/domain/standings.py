"""Classificação da fase classificatória — regulamento §5 e §6.

A classificação é SEMPRE recalculada a partir das partidas válidas; nada é acumulado
no banco. Assim, editar, anular ou retirar jogadores nunca deixa a tabela inconsistente.

Critérios de desempate (em igualdade de pontos), nesta ordem:
    1. Maior número de vitórias
    2. Confronto direto — só quando restarem exatamente dois empatados
    3. Saldo de sets
    4. Saldo de games
    5. Menos derrotas por W.O.
    6. Sorteio da organização (lottery_rank)

Com três ou mais empatados, o confronto direto é ignorado; se um critério reduzir o
empate a dois, aplica-se o confronto direto entre eles antes de prosseguir.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Hashable

from app.domain.scoring import StatLine, match_stats


@dataclass
class EntryIn:
    id: Hashable
    seed: int | None = None
    lottery_rank: int | None = None


@dataclass
class MatchIn:
    p1: Hashable
    p2: Hashable
    result_type: str
    score: dict | None
    winner_side: int | None


@dataclass
class Row:
    entry_id: Hashable
    stats: StatLine
    position: int = 0
    decided_by: str | None = None  # critério que separou este jogador do vizinho de cima
    needs_lottery: bool = False
    tied_with: list = field(default_factory=list)


CRITERIA = ("vitórias", "confronto direto", "saldo de sets", "saldo de games",
            "menos W.O.", "sorteio")


def _key(c: int, s: StatLine) -> int:
    if c == 0:
        return s.wins
    if c == 2:
        return s.set_diff
    if c == 3:
        return s.game_diff
    if c == 4:
        return -s.wo_losses
    raise AssertionError(c)


def compute_standings(entries: list[EntryIn], matches: list[MatchIn]) -> list[Row]:
    stats: dict = {e.id: StatLine() for e in entries}
    h2h: dict[tuple, Hashable] = {}  # (a, b) ordenado -> id do vencedor
    for m in matches:
        if m.p1 not in stats or m.p2 not in stats:
            continue
        a, b = match_stats(m.result_type, m.score, m.winner_side)
        stats[m.p1].add(a)
        stats[m.p2].add(b)
        if m.winner_side in (1, 2):
            winner = m.p1 if m.winner_side == 1 else m.p2
            h2h[tuple(sorted((str(m.p1), str(m.p2))))] = winner

    by_id = {e.id: e for e in entries}
    rows = {e.id: Row(entry_id=e.id, stats=stats[e.id]) for e in entries}

    def resolve(group: list, start: int, came_from_split: bool) -> list:
        """Ordena um grupo empatado a partir do critério `start`."""
        if len(group) <= 1:
            return group
        # empate reduzido a dois por um critério posterior: confronto direto primeiro
        if len(group) == 2 and came_from_split and start > 1:
            ordered = _try_h2h(group)
            if ordered:
                rows[ordered[1]].decided_by = CRITERIA[1]
                return ordered
        for c in range(start, len(CRITERIA)):
            if c == 1:
                if len(group) == 2:
                    ordered = _try_h2h(group)
                    if ordered:
                        rows[ordered[1]].decided_by = CRITERIA[1]
                        return ordered
                continue
            if c == 5:
                return _lottery(group)
            buckets: dict[int, list] = {}
            for pid in group:
                buckets.setdefault(_key(c, rows[pid].stats), []).append(pid)
            if len(buckets) == 1:
                continue
            out: list = []
            for k in sorted(buckets, reverse=True):
                sub = buckets[k]
                if out:
                    rows[sub[0]].decided_by = CRITERIA[c]
                out.extend(resolve(sub, c + 1, True))
            return out
        return group

    def _try_h2h(pair: list) -> list | None:
        w = h2h.get(tuple(sorted((str(pair[0]), str(pair[1])))))
        if w is None:
            return None
        return [w, pair[1] if w == pair[0] else pair[0]]

    def _lottery(group: list) -> list:
        drawn = all(by_id[p].lottery_rank is not None for p in group)
        if drawn:
            ordered = sorted(group, key=lambda p: by_id[p].lottery_rank)
            for p in ordered[1:]:
                rows[p].decided_by = CRITERIA[5]
            return ordered
        # sorteio ainda não realizado: mantém a ordem de cabeça de chave e sinaliza
        ordered = sorted(group, key=lambda p: (by_id[p].seed is None, by_id[p].seed or 0))
        for p in ordered:
            rows[p].needs_lottery = True
            rows[p].tied_with = [q for q in ordered if q != p]
        return ordered

    # agrupa por pontos
    point_buckets: dict[int, list] = {}
    for e in entries:
        point_buckets.setdefault(rows[e.id].stats.points, []).append(e.id)
    final: list = []
    for pts in sorted(point_buckets, reverse=True):
        grp = sorted(point_buckets[pts],
                     key=lambda p: (by_id[p].seed is None, by_id[p].seed or 0))
        final.extend(resolve(grp, 0, False))

    out = []
    for i, pid in enumerate(final, 1):
        r = rows[pid]
        r.position = i
        out.append(r)
    return out
