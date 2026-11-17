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
    phone: str = Field(min_length=8, max_length=30)  # WhatsApp: obrigatório


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


# ------------------------------------------------------------------ patrocínio
class TierIn(BaseModel):
    name: str = Field(min_length=2, max_length=60)
    tagline: str | None = Field(default=None, max_length=160)
    price_cents: int = Field(ge=0, le=100_000_000)
    slots: int | None = Field(default=None, ge=1, le=500)
    visibility_days: int = Field(default=60, ge=1, le=730)
    perks: list[str] = Field(default_factory=list, max_length=10)
    weight: int = Field(default=1, ge=1, le=3)
    sort: int = 0


class TierPatch(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=60)
    tagline: str | None = Field(default=None, max_length=160)
    price_cents: int | None = Field(default=None, ge=0, le=100_000_000)
    slots: int | None = Field(default=None, ge=1, le=500)
    unlimited: bool | None = None  # true zera o limite de vagas
    visibility_days: int | None = Field(default=None, ge=1, le=730)
    perks: list[str] | None = Field(default=None, max_length=10)
    weight: int | None = Field(default=None, ge=1, le=3)
    sort: int | None = None


class TierOut(ORM):
    id: uuid.UUID
    name: str
    tagline: str | None
    price_cents: int
    slots: int | None
    visibility_days: int
    perks: list[str] | None
    weight: int
    sort: int
    taken: int = 0
    available: bool = True


class SponsorshipIn(BaseModel):
    open: bool | None = None
    pitch: str | None = Field(default=None, max_length=2000)
    payment: str | None = Field(default=None, max_length=2000)


class SponsorshipOut(BaseModel):
    season_id: uuid.UUID
    season_name: str
    open: bool
    slug: str | None
    url: str | None
    pitch: str | None
    payment: str | None
    tiers: list[TierOut]


class SponsorIn(BaseModel):
    tier_id: uuid.UUID
    company: str = Field(min_length=2, max_length=120)
    contact_name: str = Field(min_length=2, max_length=120)
    phone: str = Field(min_length=8, max_length=30)
    email: EmailStr | None = None
    website: str | None = Field(default=None, max_length=255)
    instagram: str | None = Field(default=None, max_length=80)
    message: str | None = Field(default=None, max_length=1000)
    logo: str | None = Field(default=None, max_length=2_200_000)  # data URL (PNG/JPEG)


class SponsorPatch(BaseModel):
    status: str | None = None
    tier_id: uuid.UUID | None = None
    visible_until: date | None = None
    company: str | None = Field(default=None, min_length=2, max_length=120)
    website: str | None = Field(default=None, max_length=255)
    instagram: str | None = Field(default=None, max_length=80)
    logo: str | None = Field(default=None, max_length=2_200_000)


class SponsorOut(ORM):
    id: uuid.UUID
    season_id: uuid.UUID
    tier_id: uuid.UUID | None
    tier_name: str | None = None
    company: str
    contact_name: str
    phone: str | None
    email: str | None
    website: str | None
    instagram: str | None
    message: str | None
    status: str
    approved_at: datetime | None
    visible_until: date | None
    created_at: datetime
    logo_url: str | None = None


class PublicSponsor(BaseModel):
    id: uuid.UUID
    company: str
    website: str | None
    instagram: str | None
    tier_name: str | None
    weight: int
    logo_url: str | None


class SponsorPageCategory(BaseModel):
    name: str
    phase: str
    players: int
    start_date: date | None
    final_date: date | None
    champion: str | None


class SponsorPage(BaseModel):
    season_name: str
    open: bool
    pitch: str | None
    players: int
    matches_played: int
    categories: list[SponsorPageCategory]
    tiers: list[TierOut]
    sponsors: list[PublicSponsor]


class SponsorSubmitted(BaseModel):
    id: uuid.UUID
    payment: str | None


class ChampionCard(BaseModel):
    season: str
    category: str
    champion: str
    runner_up: str | None
    score: str | None
    sets: list[list[int]] = []          # na visão do campeão
    super_tiebreak: list[int] | None = None
    result_type: str | None = None
    played_on: date | None = None
    sponsors: list[PublicSponsor]


class MatchCard(BaseModel):
    season: str
    category: str
    stage: str
    player1: str
    player2: str
    winner_side: int | None
    score: str
    sets: list[list[int]] = []          # na visão jogador1 × jogador2
    super_tiebreak: list[int] | None = None
    result_type: str | None = None
    played_on: date | None
    sponsors: list[PublicSponsor]
