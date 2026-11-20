from fastapi import APIRouter

from app.api.v1.endpoints import admin, auth, league, sponsors

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(league.router, tags=["liga"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(sponsors.public, prefix="/public", tags=["público"])
api_router.include_router(sponsors.admin, prefix="/admin", tags=["patrocínio"])
