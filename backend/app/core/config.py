from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True, extra="ignore")

    APP_NAME: str = "Liga de Tênis"
    DEBUG: bool = False
    API_V1_PREFIX: str = "/api/v1"

    DATABASE_URL: str = "postgresql+asyncpg://tennis:tennis@localhost:5433/tennis_league"

    SECRET_KEY: str = "dev-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 30  # 30 dias: app de comunidade

    CORS_ORIGINS: str = "http://localhost:3000"
    FRONTEND_URL: str = "http://localhost:3000"  # base dos links de convite

    # Regulamento §10
    CONTEST_WINDOW_HOURS: int = 48

    # Avisos no WhatsApp (serviço agents-notify). Vazio = só registra no log.
    NOTIFY_URL: str = ""
    NOTIFY_TOKEN: str = ""
    NOTIFY_TARGET: str = ""  # JID do grupo (…@g.us) ou número

    @property
    def database_url(self) -> str:
        # Railway entrega postgres://…; o SQLAlchemy async precisa do driver explícito
        url = self.DATABASE_URL
        for prefix in ("postgres://", "postgresql://"):
            if url.startswith(prefix):
                return "postgresql+asyncpg://" + url[len(prefix):]
        return url

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
