import os
import tempfile

_db = os.path.join(tempfile.mkdtemp(), "test.db")
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{_db}"
os.environ["NOTIFY_URL"] = ""

import pytest  # noqa: E402
import pytest_asyncio  # noqa: E402
from httpx import ASGITransport, AsyncClient  # noqa: E402

from app.core.database import AsyncSessionLocal, Base, engine  # noqa: E402
from app.core.security import get_password_hash  # noqa: E402
from app.main import app  # noqa: E402
from app.models import Role, User, UserStatus  # noqa: E402
from app.services import notify  # noqa: E402


@pytest.fixture
def sent(monkeypatch):
    msgs: list[str] = []

    async def fake_send(text):
        msgs.append(text)
        return True

    monkeypatch.setattr(notify, "send", fake_send)
    return msgs


@pytest_asyncio.fixture
async def client(sent):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    async with AsyncSessionLocal() as db:
        db.add(User(email="admin@liga.com", name="Organizador", nickname="Chefe",
                    hashed_password=get_password_hash("segredo"), role=Role.ADMIN,
                    status=UserStatus.APPROVED))
        await db.commit()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
        yield c


async def login(c, email, pw="segredo"):
    r = await c.post("/api/v1/auth/login", json={"email": email, "password": pw})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}
