"""Formato da competição — regulamento §1, §2, §7 e §9."""

from __future__ import annotations

from typing import Hashable, Sequence

MIN_PER_CATEGORY = 4
MAX_PER_CATEGORY = 20


class DrawError(ValueError):
    pass


def group_count(n: int) -> int:
    """4 a 10 inscritos: grupo único; 11 a 20: dois grupos."""
    if n < MIN_PER_CATEGORY:
        raise DrawError(f"A categoria precisa de no mínimo {MIN_PER_CATEGORY} participantes "
                        f"(há {n}).")
    if n > MAX_PER_CATEGORY:
        raise DrawError(f"A categoria aceita no máximo {MAX_PER_CATEGORY} participantes; "
                        "os excedentes vão para a lista de espera.")
    return 1 if n <= 10 else 2


def serpentine_groups(seeded: Sequence[Hashable]) -> dict[str, list]:
    """Distribui jogadores já ordenados pelo nível em serpentina A, B, B, A…"""
    n_groups = group_count(len(seeded))
    if n_groups == 1:
        return {"A": list(seeded)}
    pattern = ("A", "B", "B", "A")
    groups: dict[str, list] = {"A": [], "B": []}
    for i, pid in enumerate(seeded):
        groups[pattern[i % 4]].append(pid)
    return groups


def round_robin(players: Sequence[Hashable]) -> list[list[tuple]]:
    """Todos contra todos uma vez (método do círculo).

    Devolve uma lista de rodadas; cada rodada é uma lista de confrontos (a, b).
    Com número ímpar, um jogador folga por rodada (o confronto com None é omitido).
    """
    ps: list = list(players)
    if len(ps) < 2:
        return []
    if len(ps) % 2:
        ps.append(None)
    n = len(ps)
    rounds = []
    for r in range(n - 1):
        pairs = []
        for i in range(n // 2):
            a, b = ps[i], ps[n - 1 - i]
            if a is None or b is None:
                continue
            # alterna mando para não deixar sempre o mesmo como "jogador 1"
            pairs.append((a, b) if (r + i) % 2 == 0 else (b, a))
        rounds.append(pairs)
        ps = [ps[0]] + [ps[-1]] + ps[1:-1]
    return rounds


def semifinal_slots(n_groups: int) -> list[tuple[tuple[str, int], tuple[str, int]]]:
    """Cruzamentos das semifinais em (grupo, posição).

    Grupo único: 1º × 4º e 2º × 3º. Dois grupos: 1ºA × 2ºB e 1ºB × 2ºA.
    """
    if n_groups == 1:
        return [(("A", 1), ("A", 4)), (("A", 2), ("A", 3))]
    return [(("A", 1), ("B", 2)), (("B", 1), ("A", 2))]


def qualifiers_per_group(n_groups: int) -> int:
    return 4 if n_groups == 1 else 2


def fill_semifinals(
    n_groups: int,
    ranking: dict[str, list[Hashable]],
    eligible: set,
) -> list[tuple[Hashable | None, Hashable | None]]:
    """Monta as semifinais a partir da classificação de cada grupo.

    `ranking[g]` é a ordem final do grupo (inclusive inelegíveis). Cada vaga ocupada
    por um inelegível é preenchida pelo próximo elegível do mesmo grupo que ainda não
    esteja na chave, preservando o cruzamento (§7). Se faltarem elegíveis, a vaga vira
    folga (None) e o adversário avança (§9).
    """
    q = qualifiers_per_group(n_groups)
    slot_holder: dict[tuple[str, int], Hashable | None] = {}
    for g, order in ranking.items():
        used: set = set()
        # primeiro os elegíveis que já estão nas posições classificatórias
        for pos in range(1, q + 1):
            pid = order[pos - 1] if pos - 1 < len(order) else None
            if pid is not None and pid in eligible:
                slot_holder[(g, pos)] = pid
                used.add(pid)
        # vagas restantes: próximo elegível após as posições classificatórias
        reserves = [p for p in order[q:] if p in eligible]
        for pos in range(1, q + 1):
            if (g, pos) in slot_holder:
                continue
            nxt = next((p for p in reserves if p not in used), None)
            slot_holder[(g, pos)] = nxt
            if nxt is not None:
                used.add(nxt)
    return [(slot_holder.get(a), slot_holder.get(b)) for a, b in semifinal_slots(n_groups)]
