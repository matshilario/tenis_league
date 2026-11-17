"""Textos dos avisos do grupo. Concentrados aqui para personalizar (piadas internas)."""

from app.domain.scoring import format_score


def result_reported(p1: str, p2: str, winner: str | None, score: dict | None, rt: str,
                    stage_label: str, hours: int) -> str:
    placar = format_score(score, rt)
    vencedor = f"🏆 {winner}" if winner else "sem vencedor"
    return (f"🎾 Resultado lançado — {stage_label}\n{p1} × {p2}\n{placar}  {vencedor}\n"
            f"Contestação em até {hours}h pelo app.")


def result_contested(p1: str, p2: str, by: str, reason: str) -> str:
    return f"⚠️ {by} contestou o resultado de {p1} × {p2}.\nMotivo: {reason}\nA organização vai decidir."


def result_admin(p1: str, p2: str, score: dict | None, rt: str, winner: str | None) -> str:
    w = f" — vitória de {winner}" if winner else ""
    return f"📝 Organização registrou {p1} × {p2}: {format_score(score, rt)}{w}"


def match_interrupted(p1: str, p2: str, note: str | None) -> str:
    return f"🌧️ {p1} × {p2} interrompida. Retomada do placar exato em data a definir.\n{note or ''}".strip()


def match_annulled(p1: str, p2: str) -> str:
    return f"❌ Partida {p1} × {p2} anulada."


def draw_published(category: str, n_rounds: int, start: str) -> str:
    return (f"📋 Grupos e confrontos da categoria {category} publicados!\n"
            f"{n_rounds} rodadas, começando em {start}. Confiram no app.")


def withdrawn(name: str, kept_results: bool, excluded: bool, reason: str | None) -> str:
    what = "excluído da liga" if excluded else "retirado da fase classificatória"
    extra = ("Resultados mantidos, mas fica fora das finais." if kept_results
             else "Todos os jogos contra ele foram anulados (regulamento §9).")
    r = f"\nMotivo: {reason}" if reason else ""
    return f"🚪 {name} foi {what}. {extra}{r}"


def homologated(category: str) -> str:
    return f"✅ Classificação da categoria {category} homologada."


def semis_defined(category: str, pairs: list[str]) -> str:
    return f"🔥 Semifinais — {category}\n" + "\n".join(pairs)


def final_defined(category: str, a: str, b: str) -> str:
    return f"🏟️ FINAL — {category}\n{a} × {b}"


def champion(category: str, name: str, sponsors: list[str] | None = None,
             card_url: str | None = None) -> str:
    txt = f"👑 {name} é o campeão da categoria {category}!"
    if sponsors:
        txt += "\nOferecimento: " + ", ".join(sponsors) + " 🎾"
    if card_url:
        txt += f"\nCartão do campeão: {card_url}"
    return txt


def sponsor_submitted(company: str, tier: str, contact: str, phone: str, admin_url: str) -> str:
    """Privado para a organização: chegou uma ficha pelo link de patrocínio."""
    return (f"🐒 Ficha de patrocínio nova!\n{company} quer a cota {tier}.\n"
            f"Contato: {contact} — wa.me/{phone}\nAprovar: {admin_url}")


def sponsor_approved(company: str, season: str) -> str:
    return (f"🐒 {company} entrou para o bando: agora patrocina a {season}! "
            "Valeu demais pela força. 🎾")


def member_approved(name: str) -> str:
    return f"👋 {name} entrou para a liga. Bem-vindo(a)!"


def group_invite(name: str, group_link: str, app_url: str) -> str:
    """Mensagem privada para quem acabou de ser aprovado."""
    return (f"🎾 Oi, {name}! Sua entrada na Duvis Cup foi aprovada.\n\n"
            f"Entra no grupo da liga (avisos, resultados e as zoeiras):\n{group_link}\n\n"
            f"O app da liga: {app_url}\n"
            "Cuidado com os macacos. 🐒")
