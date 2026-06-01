import os
from pydantic_settings import BaseSettings
from pydantic import field_validator

_SQLITE_FALLBACK = "sqlite:////tmp/fl_platform.db"

class Settings(BaseSettings):
    PROJECT_NAME: str = "Federated Learning Platform"
    DATABASE_URL: str = _SQLITE_FALLBACK  # default if env var is missing
    REDIS_URL: str = "redis://localhost:6379/0"

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def resolve_db_url(cls, v: str) -> str:
        """Fall back to SQLite when Supabase password placeholder is still set."""
        if not v or "YOUR_DB_PASSWORD" in v:
            print(
                "[config] DATABASE_URL still contains placeholder — "
                f"falling back to SQLite: {_SQLITE_FALLBACK}"
            )
            return _SQLITE_FALLBACK
        return v

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()
