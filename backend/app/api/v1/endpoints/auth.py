from fastapi import APIRouter, HTTPException, status
from sqlalchemy import func, select

from app.api.deps import DB, AnyUser
from app.core.security import create_access_token, get_password_hash, verify_password
from app.domain.phone import PhoneError, normalize_phone
from app.models import Invite, User, UserStatus, aware, utcnow
from app.schemas import InviteCheck, LoginIn, ProfileIn, RegisterIn, TokenOut, UserOut

router = APIRouter()


def invite_problem(inv: Invite | None) -> str | None:
    if not inv:
        return "Convite não encontrado."
    if inv.revoked:
        return "Este convite foi cancelado."
    if inv.uses >= inv.max_uses:
        return "Este convite já foi usado."
    if inv.expires_at and aware(inv.expires_at) < utcnow():
        return "Este convite expirou."
    return None


async def _find_invite(db, token: str) -> Invite | None:
    res = await db.execute(select(Invite).where(Invite.token == token))
    return res.scalars().first()


@router.get("/invite/{token}", response_model=InviteCheck)
async def check_invite(token: str, db: DB):
    inv = await _find_invite(db, token)
    problem = invite_problem(inv)
    return InviteCheck(valid=problem is None, note=inv.note if inv else None, reason=problem)


@router.post("/register", response_model=TokenOut, status_code=201)
async def register(body: RegisterIn, db: DB):
    inv = await _find_invite(db, body.invite_token)
    problem = invite_problem(inv)
    if problem:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, problem)
    try:
        phone = normalize_phone(body.phone)
    except PhoneError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from exc
    if not phone:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Informe seu WhatsApp.")
    email = body.email.lower().strip()
    exists = await db.execute(select(User).where(func.lower(User.email) == email))
    if exists.scalars().first():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Este e-mail já tem cadastro.")
    user = User(email=email, hashed_password=get_password_hash(body.password),
                name=body.name.strip(), nickname=(body.nickname or "").strip() or None,
                phone=phone, invite_id=inv.id, status=UserStatus.PENDING)
    inv.uses += 1
    db.add(user)
    await db.flush()
    return TokenOut(access_token=create_access_token(str(user.id)),
                    user=UserOut.model_validate(user))


@router.post("/login", response_model=TokenOut)
async def login(body: LoginIn, db: DB):
    res = await db.execute(select(User).where(func.lower(User.email) == body.email.lower()))
    user = res.scalars().first()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "E-mail ou senha incorretos.")
    if user.status in (UserStatus.REJECTED, UserStatus.REMOVED):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Acesso não autorizado.")
    return TokenOut(access_token=create_access_token(str(user.id)),
                    user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
async def me(user: AnyUser):
    return user


@router.patch("/me", response_model=UserOut)
async def update_me(body: ProfileIn, user: AnyUser, db: DB):
    data = body.model_dump(exclude_unset=True)
    if "phone" in data:
        try:
            data["phone"] = normalize_phone(data["phone"])
        except PhoneError as exc:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from exc
    if "password" in data:
        pw = data.pop("password")
        if pw:
            user.hashed_password = get_password_hash(pw)
    for k, v in data.items():
        if k == "name" and not v:
            continue
        setattr(user, k, (v or "").strip() or None if k != "name" else v.strip())
    await db.flush()
    return user
