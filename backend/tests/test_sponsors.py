import base64
import struct
import zlib
from datetime import date

from app.api.v1.endpoints import sponsors as SP
from tests.conftest import login
from tests.test_api import API, find, oriented, setup_league


def tiny_png() -> str:
    def chunk(t, d):
        return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d))
    raw = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", 1, 1, 8, 2, 0, 0, 0)) \
        + chunk(b"IDAT", zlib.compress(b"\x00\xff\x00\x00")) + chunk(b"IEND", b"")
    return "data:image/png;base64," + base64.b64encode(raw).decode()


def ficha(tier_id, **kw):
    d = {"tier_id": tier_id, "company": "Ferragens Zé", "contact_name": "Zé",
         "phone": "(92) 98888-7777", "logo": tiny_png()}
    d.update(kw)
    return d


async def test_patrocinio_completo(client, sent):
    SP._hits.clear()
    c = client
    adm, cat_id, P = await setup_league(c, 4)
    season_id = (await c.get(f"{API}/seasons", headers=adm)).json()[0]["id"]

    # antes de abrir: sem link
    r = await c.get(f"{API}/admin/seasons/{season_id}/sponsorship", headers=adm)
    assert r.json()["slug"] is None and r.json()["tiers"] == []
    # só admin mexe
    r = await c.patch(f"{API}/admin/seasons/{season_id}/sponsorship", json={"open": True},
                      headers=P["P0"]["h"])
    assert r.status_code == 403

    r = await c.patch(f"{API}/admin/seasons/{season_id}/sponsorship", headers=adm,
                      json={"open": True, "payment": "Pix: chave@exemplo.com"})
    assert r.status_code == 200, r.text
    sp = r.json()
    slug = sp["slug"]
    assert sp["url"].endswith(f"/patrocine/{slug}")
    tiers = {t["name"]: t for t in sp["tiers"]}
    assert set(tiers) == {"Sagui", "Macaco-prego", "Gorila"}

    # página pública, sem login
    r = await c.get(f"{API}/public/sponsor/{slug}")
    assert r.status_code == 200, r.text
    page = r.json()
    assert page["open"] and page["players"] == 4 and page["sponsors"] == []
    assert (await c.get(f"{API}/public/sponsor/nao-existe")).status_code == 404

    # ficha com logo inválida / telefone inválido
    master = tiers["Gorila"]["id"]
    r = await c.post(f"{API}/public/sponsor/{slug}", json=ficha(master, logo="data:image/png;base64,AAAA"))
    assert r.status_code == 400 and "PNG ou JPEG" in r.json()["detail"]
    r = await c.post(f"{API}/public/sponsor/{slug}", json=ficha(master, phone="123"))
    assert r.status_code == 422 or r.status_code == 400

    # admin com WhatsApp recebe aviso da ficha em privado
    await c.patch(f"{API}/auth/me", json={"phone": "(92) 99999-0000"}, headers=adm)
    r = await c.post(f"{API}/public/sponsor/{slug}", json=ficha(master, instagram="@ferragens.ze"))
    assert r.status_code == 201, r.text
    assert r.json()["payment"] == "Pix: chave@exemplo.com"
    zid = r.json()["id"]
    assert any(s.startswith("[para 5592999990000]") and "Ferragens Zé" in s for s in sent)
    assert not any(s.startswith("[para 5592988887777]") for s in sent)  # nunca escreve ao número digitado

    # pendente não aparece no site
    assert (await c.get(f"{API}/public/sponsors/active")).json() == []

    # ficha sem logo: não aprova até mandar a logo
    r = await c.post(f"{API}/public/sponsor/{slug}",
                     json=ficha(tiers["Sagui"]["id"], company="Bar do Saque", logo=None))
    nolog = r.json()["id"]
    r = await c.patch(f"{API}/admin/sponsors/{nolog}", json={"status": "approved"}, headers=adm)
    assert r.status_code == 400 and "logo" in r.json()["detail"]

    # aprova o Zé: prazo de exibição pela cota (180 dias) e aviso no grupo
    r = await c.patch(f"{API}/admin/sponsors/{zid}", json={"status": "approved"}, headers=adm)
    assert r.status_code == 200, r.text
    z = r.json()
    assert z["visible_until"] and date.fromisoformat(z["visible_until"]) > date.today()
    assert z["instagram"] == "ferragens.ze"
    assert any("Ferragens Zé entrou para o bando" in s for s in sent)

    act = (await c.get(f"{API}/public/sponsors/active")).json()
    assert [a["company"] for a in act] == ["Ferragens Zé"] and act[0]["weight"] == 3
    r = await c.get(act[0]["logo_url"])
    assert r.status_code == 200 and r.headers["content-type"] == "image/png"

    # Gorila tem 1 vaga: esgotou
    page = (await c.get(f"{API}/public/sponsor/{slug}")).json()
    assert next(t for t in page["tiers"] if t["id"] == master)["available"] is False
    r = await c.post(f"{API}/public/sponsor/{slug}", json=ficha(master, company="Outra"))
    assert r.status_code == 400 and "esgotou" in r.json()["detail"]

    # prazo vencido some do site, mas continua nos cartões do torneio
    await c.patch(f"{API}/admin/sponsors/{zid}", json={"visible_until": "2020-01-01"}, headers=adm)
    assert (await c.get(f"{API}/public/sponsors/active")).json() == []

    # cartão de resultado (público) leva as logos do torneio
    r = await c.post(f"{API}/admin/categories/{cat_id}/draw", json={"start_date": str(date.today())},
                     headers=adm)
    m = find(r.json()["matches"], "P0", "P1")
    assert (await c.get(f"{API}/public/cards/match/{m['id']}")).status_code == 404
    await c.post(f"{API}/matches/{m['id']}/report", headers=P["P0"]["h"],
                 json={"score": {"sets": oriented(m, "P0", [[6, 4], [6, 3]])}})
    card = (await c.get(f"{API}/public/cards/match/{m['id']}")).json()
    assert card["sets"] == oriented(m, "P0", [[6, 4], [6, 3]])
    assert card["score"] and [s["company"] for s in card["sponsors"]] == ["Ferragens Zé"]
    assert (await c.get(f"{API}/public/cards/champion/{cat_id}")).status_code == 404

    # fechar: página continua (mostra quem já patrocina), mas não aceita ficha
    await c.patch(f"{API}/admin/seasons/{season_id}/sponsorship", json={"open": False}, headers=adm)
    r = await c.post(f"{API}/public/sponsor/{slug}", json=ficha(tiers["Macaco-prego"]["id"]))
    assert r.status_code == 400 and "fechadas" in r.json()["detail"]

    # novo link invalida o antigo
    r = await c.post(f"{API}/admin/seasons/{season_id}/sponsorship/new-link", headers=adm)
    assert r.json()["slug"] != slug
    assert (await c.get(f"{API}/public/sponsor/{slug}")).status_code == 404


async def test_limite_de_fichas_por_ip(client):
    SP._hits.clear()
    c = client
    adm = await login(c, "admin@liga.com")
    r = await c.post(f"{API}/admin/seasons", json={"name": "Copa"}, headers=adm)
    sid = r.json()["id"]
    sp = (await c.patch(f"{API}/admin/seasons/{sid}/sponsorship", json={"open": True},
                        headers=adm)).json()
    tier = sp["tiers"][0]["id"]
    codes = [(await c.post(f"{API}/public/sponsor/{sp['slug']}",
                           json=ficha(tier, company=f"E{i}"))).status_code for i in range(6)]
    assert codes == [201] * 5 + [429]
