from fastapi import APIRouter

from app.api.v1.endpoints import admin, auth, league

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(league.router, tags=["liga"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
