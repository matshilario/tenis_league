from fastapi import APIRouter

from app.api.v1.endpoints import (
    auth,
    leagues,
    matches,
    players,
    rankings,
    schedules,
    tenants,
    tournaments,
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(tenants.router, prefix="/tenants", tags=["tenants"])
api_router.include_router(players.router, prefix="/players", tags=["players"])
api_router.include_router(leagues.router, prefix="/leagues", tags=["leagues"])
api_router.include_router(matches.router, prefix="/matches", tags=["matches"])
api_router.include_router(rankings.router, prefix="/rankings", tags=["rankings"])
api_router.include_router(tournaments.router, prefix="/tournaments", tags=["tournaments"])
api_router.include_router(schedules.router, prefix="/schedules", tags=["schedules"])
