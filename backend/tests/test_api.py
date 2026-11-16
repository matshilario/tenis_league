from datetime import date, timedelta

from sqlalchemy import update

from app.core.database import AsyncSessionLocal
from app.models import Match
from tests.conftest import login

API = "/api/v1"


async def setup_league(c, n=5):
    adm = await login(c, "admin@liga.com")
    r = await c.post(f"{API}/admin/seasons", json={"name": "2027/1"}, headers=adm)
    assert r.status_code == 201, r.text
    cat_id = r.json()["categories"][0]["id"]
    players = {}
    for i in range(n):
        r = await c.post(f"{API}/admin/invites", json={"note": f"p{i}"}, headers=adm)
        token = r.json()["token"]
        assert r.json()["url"].endswith(f"/convite/{token}")
        r = await c.post(f"{API}/auth/register", json={
            "invite_token": token, "email": f"p{i}@x.com", "password": "segredo",
            "name": f"Jogador {i}", "nickname": f"P{i}"})
        assert r.status_code == 201, r.text
        uid = r.json()["user"]["id"]
        # pendente não acessa a liga
        h = {"Authorization": f"Bearer {r.json()['access_token']}"}
        assert (await c.get(f"{API}/seasons", headers=h)).status_code == 403
        r = await c.post(f"{API}/admin/users/{uid}/approve", json={"category_id": cat_id},
                         headers=adm)
        assert r.status_code == 200, r.text
        players[f"P{i}"] = {"id": uid, "h": h}
    return adm, cat_id, players


def find(matches, a, b):
    for m in matches:
        names = {m["player1"]["display_name"] if m["player1"] else None,
                 m["player2"]["display_name"] if m["player2"] else None}
        if names == {a, b}:
            return m
    raise AssertionError((a, b))


def oriented(m, winner, sets):
    """Converte placar 'na visão do vencedor' para a ordem jogador1/jogador2."""
    if m["player1"]["display_name"] == winner:
        return sets
    return [[b, a] for a, b in sets]


async def test_convite_obrigatorio_e_seguranca(client):
    c = client
    r = await c.post(f"{API}/auth/register", json={
        "invite_token": "nao-existe", "email": "x@x.com", "password": "segredo", "name": "Xis"})
    assert r.status_code == 400
    adm, cat_id, players = await setup_league(c, 4)
    # jogador comum não acessa o admin
    assert (await c.get(f"{API}/admin/users", headers=players["P0"]["h"])).status_code == 403
    # convite de uso único não reaproveita
    r = await c.post(f"{API}/admin/invites", json={}, headers=adm)
    tok = r.json()["token"]
    ok = await c.post(f"{API}/auth/register", json={
        "invite_token": tok, "email": "a@x.com", "password": "segredo", "name": "Ana"})
    assert ok.status_code == 201
    again = await c.post(f"{API}/auth/register", json={
        "invite_token": tok, "email": "b@x.com", "password": "segredo", "name": "Bia"})
    assert again.status_code == 400
    # recusar cadastro corta o acesso
    uid = ok.json()["user"]["id"]
    await c.post(f"{API}/admin/users/{uid}/reject", headers=adm)
    r = await c.post(f"{API}/auth/login", json={"email": "a@x.com", "password": "segredo"})
    assert r.status_code == 403


async def test_temporada_completa(client, sent):
    c = client
    adm, cat_id, P = await setup_league(c, 5)

    # minimo de 4 para sortear: ok com 5 -> grupo único, 5 rodadas, 10 jogos
    r = await c.post(f"{API}/admin/categories/{cat_id}/draw",
                     json={"start_date": str(date.today())}, headers=adm)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["category"]["phase"] == "group_stage" and d["category"]["n_groups"] == 1
    assert len(d["matches"]) == 10
    assert any("publicados" in m for m in sent)
    # inscrições fechadas depois do sorteio
    r = await c.post(f"{API}/admin/categories/{cat_id}/entries", json={"user_id": P["P0"]["id"]},
                     headers=adm)
    assert r.status_code == 400

    ms = d["matches"]
    m = find(ms, "P0", "P1")
    # terceiro não pode lançar
    r = await c.post(f"{API}/matches/{m['id']}/report", headers=P["P2"]["h"],
                     json={"score": {"sets": [[6, 4], [6, 3]]}})
    assert r.status_code == 400
    # placar inválido
    r = await c.post(f"{API}/matches/{m['id']}/report", headers=P["P0"]["h"],
                     json={"score": {"sets": [[6, 5], [6, 3]]}})
    assert r.status_code == 400 and "não é um placar final" in r.json()["detail"]
    # P0 vence P1 6/4 6/3 e P1 confirma
    r = await c.post(f"{API}/matches/{m['id']}/report", headers=P["P0"]["h"],
                     json={"score": {"sets": oriented(m, "P0", [[6, 4], [6, 3]])}})
    assert r.status_code == 200 and r.json()["status"] == "reported", r.text
    assert r.json()["contest_deadline"]
    r = await c.post(f"{API}/matches/{m['id']}/confirm", headers=P["P0"]["h"])
    assert r.status_code == 400  # quem lançou não confirma
    r = await c.post(f"{API}/matches/{m['id']}/confirm", headers=P["P1"]["h"])
    assert r.json()["status"] == "confirmed"

    # P2 x P3: lançado e contestado; admin decide
    m = find(ms, "P2", "P3")
    await c.post(f"{API}/matches/{m['id']}/report", headers=P["P2"]["h"],
                 json={"score": {"sets": oriented(m, "P2", [[6, 4], [3, 6]]),
                                 "super_tiebreak": oriented(m, "P2", [[10, 8]])[0]}})
    r = await c.post(f"{API}/matches/{m['id']}/contest", headers=P["P3"]["h"],
                     json={"reason": "foi 10/12 no super"})
    assert r.json()["status"] == "contested"
    r = await c.get(f"{API}/admin/matches/pending", headers=adm)
    assert [x["id"] for x in r.json()] == [m["id"]]
    r = await c.put(f"{API}/admin/matches/{m['id']}", headers=adm, json={
        "status": "confirmed", "result_type": "normal",
        "score": {"sets": oriented(m, "P3", [[4, 6], [6, 3]]),
                  "super_tiebreak": oriented(m, "P3", [[12, 10]])[0]}})
    assert r.status_code == 200, r.text
    winner = r.json()["player1"] if r.json()["winner_side"] == 1 else r.json()["player2"]
    assert winner["display_name"] == "P3"

    # classificação: P0 28, P1 7, P3 26 (10+6+10), P2 12 (3+9)
    d = (await c.get(f"{API}/categories/{cat_id}", headers=adm)).json()
    pts = {r["player"]["display_name"]: r["points"] for r in d["groups"][0]["rows"]}
    assert pts == {"P0": 28, "P1": 7, "P2": 12, "P3": 26, "P4": 0}

    # P4 leva dois W.O. -> retirado automaticamente, jogos dele anulados
    for opp in ("P0", "P1"):
        m = find(ms, "P4", opp)
        side = 1 if m["player1"]["display_name"] == opp else 2
        r = await c.put(f"{API}/admin/matches/{m['id']}", headers=adm, json={
            "status": "confirmed", "result_type": "walkover", "winner_side": side})
        assert r.status_code == 200, r.text
    d = (await c.get(f"{API}/categories/{cat_id}", headers=adm)).json()
    p4 = next(e for e in d["entries"] if e["user"]["display_name"] == "P4")
    assert p4["status"] == "withdrawn" and not p4["eligible_finals"]
    p4_matches = [m for m in d["matches"] if "P4" in (
        (m["player1"] or {}).get("display_name"), (m["player2"] or {}).get("display_name"))]
    assert all(m["status"] == "annulled" for m in p4_matches)
    pts = {r["player"]["display_name"]: r["points"] for r in d["groups"][0]["rows"]}
    assert pts["P0"] == 28 and pts["P4"] == 0  # W.O. contra P4 não conta mais
    assert any("retirado" in s for s in sent)

    # homologação bloqueada com jogos pendentes
    r = await c.post(f"{API}/admin/categories/{cat_id}/homologate", headers=adm)
    assert r.status_code == 400 and "pendências" in r.json()["detail"]

    # completa os jogos restantes (admin lança): ordem final P0 > P3 > P2 > P1
    wins = {("P0", "P2"): "P0", ("P0", "P3"): "P0", ("P1", "P2"): "P2", ("P1", "P3"): "P3"}
    for (a, b), w in wins.items():
        m = find(d["matches"], a, b)
        r = await c.put(f"{API}/admin/matches/{m['id']}", headers=adm, json={
            "status": "confirmed", "result_type": "normal",
            "score": {"sets": oriented(m, w, [[6, 2], [6, 2]])}})
        assert r.status_code == 200, r.text

    r = await c.post(f"{API}/admin/categories/{cat_id}/semifinals", headers=adm)
    assert r.status_code == 400  # precisa homologar
    r = await c.post(f"{API}/admin/categories/{cat_id}/homologate", headers=adm)
    assert r.status_code == 200, r.text
    rows = r.json()["groups"][0]["rows"]
    assert [x["player"]["display_name"] for x in rows][:4] == ["P0", "P3", "P2", "P1"]

    r = await c.post(f"{API}/admin/categories/{cat_id}/semifinals", headers=adm)
    assert r.status_code == 200, r.text
    d = r.json()
    semis = sorted([m for m in d["matches"] if m["stage"] == "semifinal"],
                   key=lambda m: m["slot"])
    names = [{m["player1"]["display_name"], m["player2"]["display_name"]} for m in semis]
    assert names == [{"P0", "P1"}, {"P3", "P2"}]  # 1º×4º e 2º×3º

    # semis: P1 surpreende P0; P3 vence P2 (jogadores lançam, adversário confirma)
    for m, w, l in ((semis[0], "P1", "P0"), (semis[1], "P3", "P2")):
        r = await c.post(f"{API}/matches/{m['id']}/report", headers=P[w]["h"],
                         json={"score": {"sets": oriented(m, w, [[7, 6], [6, 4]]),
                                         "tiebreaks": [oriented(m, w, [[7, 5]])[0], None]}})
        assert r.status_code == 200, r.text
        await c.post(f"{API}/matches/{m['id']}/confirm", headers=P[l]["h"])
    d = (await c.get(f"{API}/categories/{cat_id}", headers=adm)).json()
    final = next(m for m in d["matches"] if m["stage"] == "final")
    assert {final["player1"]["display_name"], final["player2"]["display_name"]} == {"P1", "P3"}
    assert any("FINAL" in s for s in sent)

    # final: abandono de P3 no segundo set -> P1 campeão
    r = await c.post(f"{API}/matches/{final['id']}/report", headers=P["P1"]["h"], json={
        "result_type": "retired", "winner_side": 1 if final["player1"]["display_name"] == "P1"
        else 2, "score": {"sets": oriented(final, "P1", [[3, 6], [2, 1]])}})
    assert r.status_code == 200, r.text
    assert "abandono" in r.json()["score_text"]
    # sem confirmação: após 48h vira confirmado automaticamente
    async with AsyncSessionLocal() as db:
        from datetime import datetime, timezone
        await db.execute(update(Match).where(Match.status == "reported").values(
            reported_at=datetime.now(timezone.utc) - timedelta(hours=49)))
        await db.commit()
    d = (await c.get(f"{API}/categories/{cat_id}", headers=adm)).json()
    assert d["champion"]["display_name"] == "P1"
    assert d["category"]["phase"] == "finished"
    assert any("campeão" in s for s in sent)

    # auditoria registrou as edições
    r = await c.get(f"{API}/admin/audit", headers=adm)
    assert any(a["action"] == "match_edit" for a in r.json())


async def test_retirada_apos_concluir_mantem_resultados_e_substituicao(client):
    c = client
    adm, cat_id, P = await setup_league(c, 4)
    await c.post(f"{API}/admin/categories/{cat_id}/draw",
                 json={"start_date": str(date.today())}, headers=adm)
    d = (await c.get(f"{API}/categories/{cat_id}", headers=adm)).json()

    # substituição antes de jogar: P3 sai, novo jogador entra no lugar
    r = await c.post(f"{API}/admin/invites", json={}, headers=adm)
    r = await c.post(f"{API}/auth/register", json={
        "invite_token": r.json()["token"], "email": "novo@x.com", "password": "segredo",
        "name": "Novato", "nickname": "Novato"})
    new_id = r.json()["user"]["id"]
    await c.post(f"{API}/admin/users/{new_id}/approve", json={}, headers=adm)
    e3 = next(e for e in d["entries"] if e["user"]["display_name"] == "P3")
    r = await c.post(f"{API}/admin/entries/{e3['id']}/substitute", json={"user_id": new_id},
                     headers=adm)
    assert r.status_code == 200 and r.json()["user"]["display_name"] == "Novato"

    # P0 joga todos os seus 3 jogos e depois desiste: resultados mantidos, inelegível
    d = (await c.get(f"{API}/categories/{cat_id}", headers=adm)).json()
    for opp in ("P1", "P2", "Novato"):
        m = find(d["matches"], "P0", opp)
        await c.put(f"{API}/admin/matches/{m['id']}", headers=adm, json={
            "status": "confirmed", "result_type": "normal",
            "score": {"sets": oriented(m, "P0", [[6, 0], [6, 0]])}})
    e0 = next(e for e in d["entries"] if e["user"]["display_name"] == "P0")
    r = await c.post(f"{API}/admin/entries/{e0['id']}/withdraw", json={"reason": "lesão"},
                     headers=adm)
    assert r.status_code == 200 and r.json()["status"] == "withdrawn"
    d = (await c.get(f"{API}/categories/{cat_id}", headers=adm)).json()
    rows = d["groups"][0]["rows"]
    assert rows[0]["player"]["display_name"] == "P0" and rows[0]["points"] == 84
    assert not rows[0]["eligible_finals"]

    # excluir membro com histórico: mantém dados e retira das categorias
    r = await c.delete(f"{API}/admin/users/{P['P1']['id']}", headers=adm)
    assert r.json() == {"deleted": False, "kept_history": True}
    r = await c.post(f"{API}/auth/login", json={"email": "p1@x.com", "password": "segredo"})
    assert r.status_code == 403


async def test_interrupcao_e_wo_duplo(client):
    c = client
    adm, cat_id, P = await setup_league(c, 4)
    await c.post(f"{API}/admin/categories/{cat_id}/draw",
                 json={"start_date": str(date.today())}, headers=adm)
    d = (await c.get(f"{API}/categories/{cat_id}", headers=adm)).json()
    m = find(d["matches"], "P0", "P1")
    r = await c.put(f"{API}/admin/matches/{m['id']}", headers=adm, json={
        "status": "interrupted", "score": {"sets": [[6, 4], [2, 3]]},
        "note": "Chuva. 30/15, saque de P1, lado direito."})
    assert r.json()["status"] == "interrupted"
    # retomada: jogador lança o resultado final normalmente
    r = await c.post(f"{API}/matches/{m['id']}/report", headers=P["P0"]["h"],
                     json={"score": {"sets": oriented(m, "P0", [[6, 4], [6, 3]])}})
    assert r.status_code == 200, r.text

    m = find(d["matches"], "P2", "P3")
    r = await c.put(f"{API}/admin/matches/{m['id']}", headers=adm, json={
        "status": "confirmed", "result_type": "double_walkover"})
    assert r.status_code == 200, r.text
    d = (await c.get(f"{API}/categories/{cat_id}", headers=adm)).json()
    rows = {x["player"]["display_name"]: x for x in d["groups"][0]["rows"]}
    assert rows["P2"]["points"] == rows["P3"]["points"] == 0
    assert rows["P2"]["wo_losses"] == rows["P3"]["wo_losses"] == 1


async def test_dois_grupos_e_lista_de_espera(client):
    c = client
    adm, cat_id, P = await setup_league(c, 12)
    r = await c.post(f"{API}/admin/categories/{cat_id}/draw",
                     json={"start_date": "2027-03-01"}, headers=adm)
    d = r.json()
    assert d["category"]["n_groups"] == 2
    sizes = sorted(len(g["rows"]) for g in d["groups"])
    assert sizes == [6, 6]
    # serpentina A,B,B,A: seeds 1,4,5,8,9,12 no A
    a = sorted(e["seed"] for e in d["entries"] if e["group_name"] == "A")
    assert a == [1, 4, 5, 8, 9, 12]
    assert len(d["matches"]) == 2 * 15
    r1 = [m for m in d["matches"] if m["round"] == 1]
    assert {m["deadline"] for m in r1} == {"2027-03-07"}
    assert d["category"]["makeup_deadline"] == "2027-04-11"  # 5 rodadas + 1 semana
