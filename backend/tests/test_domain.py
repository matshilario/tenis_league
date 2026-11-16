import pytest

from app.domain.draw import (
    DrawError,
    fill_semifinals,
    group_count,
    round_robin,
    serpentine_groups,
)
from app.domain.scoring import (
    ScoreError,
    complete_retirement,
    format_score,
    match_stats,
    resolve_result,
    validate_score,
)
from app.domain.standings import EntryIn, MatchIn, compute_standings


# ----------------------------------------------------------------- §5 exemplos
def test_regulamento_exemplo_6_4_6_3():
    a, b = match_stats("normal", {"sets": [[6, 4], [6, 3]]}, 1)
    assert a.points == 28  # 10 + 6 + 12
    assert b.points == 7


def test_regulamento_exemplo_super_tiebreak():
    sc = {"sets": [[6, 4], [3, 6]], "super_tiebreak": [10, 8]}
    assert validate_score(sc) == 1
    a, b = match_stats("normal", sc, 1)
    assert a.points == 25  # 10 + 6 + 9
    assert b.points == 13  # 3 + 10
    assert (a.sets_won, a.sets_lost, a.games_won, a.games_lost) == (2, 1, 9, 10)


def test_tiebreak_de_set_nao_pontua():
    sc = {"sets": [[7, 6], [6, 0]], "tiebreaks": [[7, 3], None]}
    a, b = match_stats("normal", sc, 1)
    assert a.points == 10 + 6 + 13
    assert b.points == 6


def test_wo_vale_28_e_zero():
    a, b = match_stats("walkover", None, 2)
    assert (a.points, b.points) == (0, 28)
    assert a.wo_losses == 1 and a.games_lost == 12 and a.sets_lost == 2


def test_wo_duplo_zera_os_dois():
    a, b = match_stats("double_walkover", None, None)
    assert a.points == b.points == 0
    assert a.wo_losses == b.wo_losses == 1
    assert a.sets_won == a.sets_lost == 0


# ------------------------------------------------------------------- validação
@pytest.mark.parametrize("sc", [
    {"sets": [[6, 5], [6, 0]]},
    {"sets": [[8, 6], [6, 0]]},
    {"sets": [[6, 4]]},
    {"sets": [[6, 4], [4, 6]]},  # falta super tie-break
    {"sets": [[6, 4], [6, 4]], "super_tiebreak": [10, 3]},
    {"sets": [[6, 4], [4, 6]], "super_tiebreak": [10, 9]},
    {"sets": [[6, 4], [4, 6]], "super_tiebreak": [13, 9]},
    {"sets": [[6, 4], [7, 6]], "tiebreaks": [None, [7, 6]]},
])
def test_placares_invalidos(sc):
    with pytest.raises(ScoreError):
        validate_score(sc)


def test_super_tiebreak_longo_valido():
    assert validate_score({"sets": [[4, 6], [6, 1]], "super_tiebreak": [12, 14]}) == 2


def test_vencedor_informado_divergente():
    with pytest.raises(ScoreError):
        resolve_result("normal", {"sets": [[6, 4], [6, 3]]}, 2)


# --------------------------------------------------------------------- abandono
def test_abandono_no_primeiro_set():
    sc = complete_retirement({"sets": [[3, 2]]}, 2)
    # vencedor (lado 2) completa o set: 3/6 (desistente fica com 3), depois 0/6
    assert sc["sets"] == [[3, 6], [0, 6]]
    assert not sc["stb_awarded"]


def test_abandono_vira_stb_atribuido():
    sc = complete_retirement({"sets": [[6, 2], [5, 5]]}, 2)
    assert sc["sets"] == [[6, 2], [5, 7]]
    assert sc["stb_awarded"]
    a, b = match_stats("retired", sc, 2)
    assert b.sets_won == 2 and b.games_won == 9
    assert b.points == 10 + 6 + 9
    assert a.points == 3 + 11


def test_abandono_no_tiebreak():
    sc = complete_retirement({"sets": [[6, 6]]}, 1)
    assert sc["sets"] == [[7, 6], [6, 0]]


def test_abandono_desistente_ja_venceu():
    with pytest.raises(ScoreError):
        complete_retirement({"sets": [[6, 1], [6, 1]]}, 2)


def test_format():
    assert format_score({"sets": [[6, 4], [3, 6]], "super_tiebreak": [10, 8]}) == \
        "6/4 3/6 [10/8]"


# --------------------------------------------------------------------- desempate
def _m(p1, p2, sets, stb=None, rt="normal", w=None):
    sc = {"sets": sets, "super_tiebreak": stb} if sets else None
    if w is None and sc:
        w = validate_score(sc)
    return MatchIn(p1, p2, rt, sc, w)


def test_desempate_confronto_direto_entre_dois():
    # A e B com mesmos pontos e vitórias; B venceu o confronto direto
    entries = [EntryIn("A", 1), EntryIn("B", 2), EntryIn("C", 3)]
    matches = [
        _m("B", "A", [[6, 4], [6, 4]]),   # B 28, A 8
        _m("A", "C", [[6, 0], [6, 0]]),   # A 28, C 0
        _m("C", "B", [[6, 4], [6, 4]]),   # C 28, B 8
    ]
    rows = compute_standings(entries, matches)
    pts = {r.entry_id: r.stats.points for r in rows}
    assert pts == {"A": 36, "B": 36, "C": 28}
    assert [r.entry_id for r in rows][:2] == ["B", "A"]
    assert rows[1].decided_by == "confronto direto"


def test_empate_triplo_ignora_confronto_direto():
    # triângulo perfeito A>B, B>C, C>A com mesmos placares: tudo igual -> sorteio
    entries = [EntryIn("A", 1), EntryIn("B", 2), EntryIn("C", 3)]
    matches = [
        _m("A", "B", [[6, 4], [6, 4]]),
        _m("B", "C", [[6, 4], [6, 4]]),
        _m("C", "A", [[6, 4], [6, 4]]),
    ]
    rows = compute_standings(entries, matches)
    assert all(r.needs_lottery for r in rows)
    entries = [EntryIn("A", 1, 3), EntryIn("B", 2, 1), EntryIn("C", 3, 2)]
    rows = compute_standings(entries, matches)
    assert [r.entry_id for r in rows] == ["B", "C", "A"]
    assert not any(r.needs_lottery for r in rows)


def test_regra_reducao_a_dois_explicita():
    # construímos stats direto: três empatados em pontos e vitórias,
    # saldo de sets coloca X na frente; Y e Z empatam no saldo de sets mas
    # Z tem saldo de games melhor; Y venceu Z -> Y à frente de Z.
    from app.domain import standings as st
    from app.domain.scoring import StatLine

    rows_stats = {
        "X": StatLine(wins=1, points=30, sets_won=4, sets_lost=1, games_won=20),
        "Y": StatLine(wins=1, points=30, sets_won=3, sets_lost=2, games_won=10,
                      games_lost=20),
        "Z": StatLine(wins=1, points=30, sets_won=3, sets_lost=2, games_won=20,
                      games_lost=10),
    }
    orig = st.match_stats

    def fake(rt, sc, ws):
        return next(calls)

    entries = [EntryIn("X", 1), EntryIn("Y", 2), EntryIn("Z", 3)]
    # uma partida Y×Z com Y vencendo, cujas stats injetamos para somar exatamente
    calls = iter([(rows_stats["Y"], rows_stats["Z"]), (rows_stats["X"], st.StatLine())])
    st.match_stats = fake
    try:
        rows = compute_standings(entries + [EntryIn("W", 4)], [
            MatchIn("Y", "Z", "normal", {}, 1),
            MatchIn("X", "W", "normal", {}, 1),
        ])
    finally:
        st.match_stats = orig
    order = [r.entry_id for r in rows]
    assert order[:3] == ["X", "Y", "Z"]
    assert rows[2].decided_by == "confronto direto"


# ------------------------------------------------------------------------ sorteio
def test_group_count_limites():
    assert group_count(4) == 1 and group_count(10) == 1
    assert group_count(11) == 2 and group_count(20) == 2
    with pytest.raises(DrawError):
        group_count(3)
    with pytest.raises(DrawError):
        group_count(21)


def test_serpentina():
    g = serpentine_groups(list(range(1, 12)))
    assert g["A"] == [1, 4, 5, 8, 9]
    assert g["B"] == [2, 3, 6, 7, 10, 11]


@pytest.mark.parametrize("n", [4, 5, 7, 10])
def test_round_robin_todos_contra_todos(n):
    rounds = round_robin(list(range(n)))
    pairs = [frozenset(p) for r in rounds for p in r]
    assert len(pairs) == n * (n - 1) // 2 == len(set(pairs))
    for r in rounds:
        flat = [x for p in r for x in p]
        assert len(flat) == len(set(flat))
    assert len(rounds) == (n if n % 2 else n - 1)


def test_semis_grupo_unico_e_substituicao():
    order = {"A": ["p1", "p2", "p3", "p4", "p5", "p6"]}
    assert fill_semifinals(1, order, set(order["A"])) == [("p1", "p4"), ("p2", "p3")]
    # p2 inelegível: p5 ocupa a vaga dele (preserva o cruzamento)
    elig = set(order["A"]) - {"p2"}
    assert fill_semifinals(1, order, elig) == [("p1", "p4"), ("p5", "p3")]


def test_semis_dois_grupos_e_folga():
    order = {"A": ["a1", "a2"], "B": ["b1", "b2", "b3"]}
    assert fill_semifinals(2, order, {"a1", "a2", "b1", "b2", "b3"}) == \
        [("a1", "b2"), ("b1", "a2")]
    # a2 inelegível e grupo A sem reserva -> folga
    assert fill_semifinals(2, order, {"a1", "b1", "b2", "b3"}) == \
        [("a1", "b2"), ("b1", None)]
