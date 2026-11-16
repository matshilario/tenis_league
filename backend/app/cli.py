"""Uso: python -m app.cli create-admin EMAIL NOME [--senha SENHA]

Cria (ou promove) o administrador da liga. Sem --senha, pergunta no terminal.
"""

import argparse
import asyncio
import getpass

from sqlalchemy import func, select

from app.core.database import AsyncSessionLocal
from app.core.security import get_password_hash
from app.models import Role, User, UserStatus, utcnow


async def create_admin(email: str, name: str, password: str) -> None:
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(User).where(func.lower(User.email) == email.lower()))
        user = res.scalars().first()
        if user:
            user.role, user.status = Role.ADMIN, UserStatus.APPROVED
            user.approved_at = user.approved_at or utcnow()
            if password:
                user.hashed_password = get_password_hash(password)
            print(f"Usuário {email} promovido a admin.")
        else:
            db.add(User(email=email.lower(), name=name, hashed_password=get_password_hash(password),
                        role=Role.ADMIN, status=UserStatus.APPROVED, approved_at=utcnow()))
            print(f"Admin {email} criado.")
        await db.commit()


def main() -> None:
    p = argparse.ArgumentParser()
    sub = p.add_subparsers(dest="cmd", required=True)
    c = sub.add_parser("create-admin")
    c.add_argument("email")
    c.add_argument("name")
    c.add_argument("--senha", default=None)
    a = p.parse_args()
    pw = a.senha or getpass.getpass("Senha: ")
    asyncio.run(create_admin(a.email, a.name, pw))


if __name__ == "__main__":
    main()
