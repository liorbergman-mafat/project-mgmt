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

    # The `anon` (public) key. Used only to ask Supabase Auth to validate a
    # user's access token — it grants no data access on its own (RLS denies it).
    supabase_anon_key: str

    # Allowed CORS origins. Defaults to the Vite dev server; in production set
    # FRONTEND_ORIGIN to the deployed site, e.g. https://loan-manager.vercel.app
    # (comma-separated to allow more than one).
    frontend_origin: str = "http://localhost:5173"

    # Serves the interactive API docs at /docs. Off in production: the schema
    # is a complete map of the API and /docs is a working client for it.
    debug: bool = False

    @property
    def frontend_origins(self) -> list[str]:
        return [o.strip() for o in self.frontend_origin.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
