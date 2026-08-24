from functools import lru_cache

from supabase import Client, create_client

from .config import get_settings


@lru_cache
def get_client() -> Client:
    """
    A single shared Supabase client.

    This uses the service_role key, which bypasses Row Level Security. That is
    intentional and safe *only* because this key never leaves the server — the
    browser talks to FastAPI, and FastAPI talks to Supabase. Never ship this
    key to the frontend.
    """
    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_service_key)
