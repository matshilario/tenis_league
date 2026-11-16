import asyncio
import contextlib
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import settings

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("liga")


async def _settle_loop() -> None:
    """Confirma resultados com prazo de contestação vencido (e dispara os avisos)."""
    from app.core.database import AsyncSessionLocal
    from app.services.league import settle_overdue
    from app.services.notify import Outbox

    while True:
        await asyncio.sleep(15 * 60)
        try:
            outbox = Outbox()
            async with AsyncSessionLocal() as db:
                await settle_overdue(db, outbox)
                await db.commit()
            await outbox.flush()
        except Exception:  # noqa: BLE001
            log.exception("settle loop")


@asynccontextmanager
async def lifespan(_: FastAPI):
    task = asyncio.create_task(_settle_loop())
    yield
    task.cancel()
    with contextlib.suppress(asyncio.CancelledError):
        await task

app = FastAPI(
    title=settings.APP_NAME,
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
    docs_url=f"{settings.API_V1_PREFIX}/docs",
    redoc_url=None,
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/health")
async def health():
    return {"status": "ok"}
