"""Avisos no WhatsApp via serviço agents-notify (POST /notify)."""

import logging

import httpx
from fastapi import BackgroundTasks

from app.core.config import settings

log = logging.getLogger("liga.notify")


async def send(text: str) -> bool:
    if not (settings.NOTIFY_URL and settings.NOTIFY_TOKEN):
        log.info("[notify desativado] %s", text)
        return False
    body = {"text": text, "source": "liga-tenis"}
    if settings.NOTIFY_TARGET:
        body["number"] = settings.NOTIFY_TARGET
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.post(
                settings.NOTIFY_URL.rstrip("/") + "/notify",
                json=body,
                headers={"Authorization": f"Bearer {settings.NOTIFY_TOKEN}"},
            )
        if r.status_code >= 400:
            log.warning("notify %s: %s", r.status_code, r.text[:300])
            return False
        return True
    except httpx.HTTPError as exc:  # aviso nunca derruba a operação principal
        log.warning("notify falhou: %s", exc)
        return False


class Outbox:
    """Acumula avisos durante a requisição; enviados depois da resposta."""

    def __init__(self) -> None:
        self.messages: list[str] = []

    def add(self, text: str | None) -> None:
        if text:
            self.messages.append(text)

    async def flush(self) -> None:
        for m in self.messages:
            await send(m)


def get_outbox(bg: BackgroundTasks) -> Outbox:
    ob = Outbox()
    bg.add_task(ob.flush)
    return ob
