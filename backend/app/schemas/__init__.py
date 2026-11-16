import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ------------------------------------------------------------------ usuários
class UserOut(ORM):
    id: uuid.UUID
    email: str
    name: str
    nickname: str | None
    display_name: str
    phone: str | None
    role: str
    status: str
    created_at: datetime
    approved_at: datetime | None


class PublicUser(ORM):
    id: uuid.UUID
    name: str
    nickname: str | None
    display_name: str


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class RegisterIn(BaseModel):
    invite_token: str
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    name: str = Field(min_length=2, max_length=120)
    nickname: str | None = Field(default=None, max_length=60)
    phone: str | None = Field(default=None, max_length=30)


class ProfileIn(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    nickname: str | None = Field(default=None, max_length=60)
    phone: str | None = Field(default=None, max_length=30)
    password: str | None = Field(default=None, min_length=6, max_length=128)


class AdminUserIn(BaseModel):
    nickname: str | None = None
    role: str | None = Field(default=None, pattern="^(admin|player)$")


class ApproveIn(BaseModel):
    category_id: uuid.UUID | None = None  # já inscreve numa categoria


# -------------------------------------------------------------------- convites
class InviteIn(BaseModel):
    note: str | None = Field(default=None, max_length=200)
    max_uses: int = Field(default=1, ge=1, le=50)
    expires_in_days: int | None = Field(default=14, ge=1, le=365)


class InviteOut(ORM):
    id: uuid.UUID
    token: str
    note: str | None
    max_uses: int
    uses: int
    expires_at: datetime | None
    revoked: bool
    created_at: datetime
    url: str = ""
    valid: bool = True


class InviteCheck(BaseModel):
    valid: bool
    note: str | None = None
    reason: str | None = None


# ------------------------------------------------------------ temporada/categoria
class SeasonIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    announcement: str | None = None
    category_name: str = Field(default="Principal", max_length=80)


class SeasonPatch(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    announcement: str | None = None
    is_current: bool | None = None


class CategoryIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)


class CategoryPatch(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=80)
    semis_date: date | None = None
    final_date: date | None = None


class CategoryBrief(ORM):
    id: uuid.UUID
    name: str
    phase: str
    n_groups: int | None
    start_date: date | None
    makeup_deadline: date | None
    semis_date: date | None
    final_date: date | None
    homologated_at: datetime | None
    champion_entry_id: uuid.UUID | None


class SeasonOut(ORM):
    id: uuid.UUID
    name: str
    announcement: str | None
    is_current: bool
    created_at: datetime
    categories: list[CategoryBrief]


class EntryOut(ORM):
    id: uuid.UUID
    user: PublicUser
    seed: int | None
    group_name: str | None
    status: str
    eligible_finals: bool
    lottery_rank: int | None
    status_reason: str | None


class EntryAddIn(BaseModel):
    user_id: uuid.UUID


class EntryPatch(BaseModel):
    seed: int | None = Field(default=None, ge=1)
    status: str | None = Field(default=None, pattern="^(active|waitlist)$")


class SeedOrderIn(BaseModel):
    entry_ids: list[uuid.UUID]  # ordem completa = cabeças de chave 1..n


class DrawIn(BaseModel):
    start_date: date


class WithdrawIn(BaseModel):
    reason: str | None = Field(default=None, max_length=300)
    exclude: bool = False


class SubstituteIn(BaseModel):
    user_id: uuid.UUID


# --------------------------------------------------------------------- partidas
class MatchOut(ORM):
    id: uuid.UUID
    category_id: uuid.UUID
    stage: str
    group_name: str | None
    round: int | None
    slot: int | None
    deadline: date | None
    entry1_id: uuid.UUID | None
    entry2_id: uuid.UUID | None
    player1: PublicUser | None = None
    player2: PublicUser | None = None
    status: str
    result_type: str | None
    score: dict | None
    score_text: str = ""
    winner_side: int | None
    played_on: date | None
    reported_by_id: uuid.UUID | None
    reported_at: datetime | None
    contest_deadline: datetime | None = None
    contest_reason: str | None
    note: str | None


class ReportIn(BaseModel):
    result_type: str = Field(default="normal", pattern="^(normal|retired)$")
    score: dict
    winner_side: int | None = Field(default=None, ge=1, le=2)
    played_on: date | None = None


class ContestIn(BaseModel):
    reason: str = Field(min_length=3, max_length=1000)


class DeadlineIn(BaseModel):
    deadline: date


class AdminMatchIn(BaseModel):
    status: str = Field(pattern="^(confirmed|interrupted|annulled|scheduled)$")
    result_type: str | None = Field(
        default=None, pattern="^(normal|walkover|double_walkover|retired)$")
    score: dict | None = None
    winner_side: int | None = Field(default=None, ge=1, le=2)
    played_on: date | None = None
    note: str | None = None
    deadline: date | None = None


# ---------------------------------------------------------------- classificação
class StandingOut(BaseModel):
    position: int
    entry_id: uuid.UUID
    player: PublicUser
    entry_status: str
    eligible_finals: bool
    played: int
    wins: int
    losses: int
    sets_won: int
    sets_lost: int
    games_won: int
    games_lost: int
    wo_losses: int
    points: int
    form: list[str]
    decided_by: str | None
    needs_lottery: bool
    qualifies: bool


class GroupOut(BaseModel):
    name: str
    rows: list[StandingOut]


class CategoryDetail(BaseModel):
    category: CategoryBrief
    season: dict
    entries: list[EntryOut]
    groups: list[GroupOut]
    matches: list[MatchOut]
    champion: PublicUser | None


class AuditOut(ORM):
    id: uuid.UUID
    action: str
    summary: str
    details: dict | None
    created_at: datetime
    actor_id: uuid.UUID | None
