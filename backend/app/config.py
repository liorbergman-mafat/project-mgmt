from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuration, read from backend/.env (see .env.example)."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    supabase_url: str
    supabase_service_key: str

    # HMAC key for session tokens (see tokens.py). Generate with
    # `openssl rand -hex 32`. Rotating it invalidates every open session at
    # once, which is exactly what you want after a suspected leak.
    session_secret: str

    # Where the Vite dev server runs, for CORS.
    frontend_origin: str = "http://localhost:5173"

    # First-run seed only. Set both, sign in, change the password from the
    # users screen, then unset them. With either one absent no account is
    # ever created automatically — a password living in the repository is a
    # password known to everyone who can read it.
    bootstrap_username: str = ""
    bootstrap_password: str = ""

    # Serves the interactive API docs at /docs. Off in production: the schema
    # is a complete map of the API and /docs is a working client for it.
    debug: bool = False


@lru_cache
def get_settings() -> Settings:
    return Settings()
