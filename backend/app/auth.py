"""
Authentication and authorization.

Google is the only identity provider wired up in Supabase Auth, so a valid
access token means "a real Google account signed in". That is *authentication*,
and Supabase handles it end to end.

Whether that account may use this app is a separate decision, and it stays
here: the account's email must appear in the `allowed_users` table. That is
*authorization*, and it is ours to control regardless of who can obtain a
Google login. Adding or removing a row in `allowed_users` (from the Supabase
dashboard, or SQL) is the whole user-management surface.

`require_user` is applied to every data router in `main.py`, so no endpoint is
reachable without a valid token whose email is on the list.
"""

from __future__ import annotations

import time
from dataclasses import dataclass
from functools import lru_cache

from fastapi import HTTPException, Request
from supabase import Client, create_client

from .config import get_settings
from .repository import table

# Shown to the browser when the token is fine but the account is not listed.
# Hebrew, to match the rest of the user-facing error copy.
NOT_AUTHORIZED_DETAIL = "החשבון שאיתו התחברת אינו מורשה לשימוש במערכת. פנה למנהל המערכת."


@dataclass(frozen=True)
class AuthUser:
    id: str
    email: str


@lru_cache
def _auth_client() -> Client:
    """A client on the public key, used only for `auth.get_user(token)`."""
    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_anon_key)


# token -> (expires_at_monotonic, AuthUser | None).
#
# A hit for `None` means "verified, but not on the allowlist". The short TTL is
# the trade-off: a row pulled from `allowed_users` stops working within a
# minute, and in return a burst of API calls from one open tab costs one round
# trip to Supabase Auth plus one table read, not one of each per call.
_CACHE: dict[str, tuple[float, "AuthUser | None"]] = {}
_CACHE_TTL_SECONDS = 60
_CACHE_MAX_ENTRIES = 512


def _cache_get(token: str) -> tuple[bool, "AuthUser | None"]:
    hit = _CACHE.get(token)
    if hit is None:
        return False, None
    if hit[0] <= time.monotonic():
        _CACHE.pop(token, None)
        return False, None
    return True, hit[1]


def _cache_put(token: str, user: "AuthUser | None") -> None:
    # No LRU nicety — when it fills up, drop everything. Entries are short-lived
    # anyway, and the map only grows with distinct concurrent sessions.
    if len(_CACHE) >= _CACHE_MAX_ENTRIES:
        _CACHE.clear()
    _CACHE[token] = (time.monotonic() + _CACHE_TTL_SECONDS, user)


def _verify_token(token: str) -> AuthUser:
    """Ask Supabase Auth who this token belongs to. 401 if it cannot say."""
    try:
        result = _auth_client().auth.get_user(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired session")

    user = getattr(result, "user", None)
    if user is None or not getattr(user, "email", None):
        raise HTTPException(status_code=401, detail="Invalid or expired session")

    return AuthUser(id=str(user.id), email=user.email.lower())


def _is_allowed(email: str) -> bool:
    response = (
        table("allowed_users").select("email").eq("email", email).limit(1).execute()
    )
    return bool(response.data)


def _resolve(token: str) -> "AuthUser | None":
    """
    Verify a token and check the allowlist, going through the cache. Returns the
    user, or None if the token is bad *or* the account is not authorized — the
    caller decides what each of those means.
    """
    cached, user = _cache_get(token)
    if cached:
        return user

    try:
        verified = _verify_token(token)
    except HTTPException:
        return None

    user = verified if _is_allowed(verified.email) else None
    _cache_put(token, user)
    return user


def bearer_token(authorization_header: str) -> str:
    """The token out of an "Authorization: Bearer <token>" header, or ""."""
    scheme, _, token = authorization_header.partition(" ")
    return token if scheme.lower() == "bearer" and token else ""


def user_for_header(authorization_header: str) -> "AuthUser | None":
    """
    Non-raising lookup for callers that only want a name to credit — the
    activity middleware, which must never turn a logging concern into a failed
    request. `require_user` is the gate; this is not.
    """
    token = bearer_token(authorization_header)
    return _resolve(token) if token else None


def require_user(request: Request) -> AuthUser:
    """
    FastAPI dependency: require a Bearer token that Supabase accepts and whose
    email is in `allowed_users`. Raises 401 (no/invalid token) or 403 (valid
    token, account not authorized).
    """
    token = bearer_token(request.headers.get("Authorization", ""))
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # A cache miss re-runs verification below; a cache hit for `None` could mean
    # either "bad token" or "not allowed", so an uncached token is verified
    # once more here to tell 401 from 403.
    cached, user = _cache_get(token)
    if cached:
        if user is None:
            raise HTTPException(status_code=403, detail=NOT_AUTHORIZED_DETAIL)
        return user

    user = _verify_token(token)
    if not _is_allowed(user.email):
        _cache_put(token, None)
        raise HTTPException(status_code=403, detail=NOT_AUTHORIZED_DETAIL)

    _cache_put(token, user)
    return user
