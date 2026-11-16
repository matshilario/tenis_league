import uuid
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import decode_token
from app.models import Role, User, UserStatus
from app.services.notify import Outbox, get_outbox

bearer = HTTPBearer(auto_error=False)

DB = Annotated[AsyncSession, Depends(get_db)]
OutboxDep = Annotated[Outbox, Depends(get_outbox)]


async def get_current_user(
    db: DB, cred: HTTPAuthorizationCredentials | None = Depends(bearer)
) -> User:
    if not cred:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Faça login.")
    payload = decode_token(cred.credentials)
    try:
        user_id = uuid.UUID(payload["sub"]) if payload else None
    except (KeyError, ValueError):
        user_id = None
    user = await db.get(User, user_id) if user_id else None
    if not user or user.status in (UserStatus.REJECTED, UserStatus.REMOVED):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Sessão inválida. Faça login de novo.")
    return user


async def get_member(user: User = Depends(get_current_user)) -> User:
    if user.status != UserStatus.APPROVED:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Cadastro aguardando aprovação.")
    return user


async def get_admin(user: User = Depends(get_member)) -> User:
    if user.role != Role.ADMIN:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Acesso restrito à organização.")
    return user


AnyUser = Annotated[User, Depends(get_current_user)]
Member = Annotated[User, Depends(get_member)]
Admin = Annotated[User, Depends(get_admin)]
