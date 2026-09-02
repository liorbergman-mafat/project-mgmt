"""
Authentication and authorization.

Google is the only identity provider wired up in Supabase Auth, so a valid
access token means "a real Google account signed in". That is *authentication*,
and Supabase handles it end to end.

Whether that account may use this app is a separate decision, and it stays
here: the account's email must appear in the `allowed_users` table. That is
*authorization*. The one distinction the table draws is `is_admin` — an admin
may edit the allowlist itself (the הרשאות screen); everyone else has the same
access to everything else.

`require_user` is applied to every data router in `main.py`, so no endpoint is
reachable without a valid token whose email is on the list. `require_admin`
gates the allowlist-management router on top of that.
"""

from __future__ import annotations

import time
from dataclasses import dataclass
from functools import lru_cache

from fastapi import Depends, HTTPException, Request
from supabase import Client, create_client

from .config import get_settings
from .repository import table

# Shown to the browser when the token is fine but the account is not listed.
# Hebrew, to match the rest of the user-facing error copy.
NOT_AUTHORIZED_DETAIL = "החשבון שאיתו התחברת אינו מורשה לשימוש במערכת. פנה למנהל המערכת."
NOT_ADMIN_DETAIL = "הפעולה מותרת למנהלי מערכת בלבד."


@dataclass(frozen=True)
class AuthUser:
    id: str
    email: str
    name: str
    is_admin: bool = False

    @property
    def actor(self) -> str:
        """How this user is credited in the activity log: "Name (email)"."""
        if self.name and self.name != self.email:
            return f"{self.name} ({self.email})"
        return self.email


def _str(value: object) -> str | None:
    return value if isinstance(value, str) and value else None


@lru_cache
def _auth_client() -> Client:
    """A client on the public key, used only for `auth.get_user(token)`."""
    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_anon_key)


# token -> (expires_at_monotonic, AuthUser | None).
#
# A hit for `None` means "verified, but not on the allowlist". The short TTL is
# the trade-off: a change in `allowed_users` (a new row, or a flipped
# `is_admin`) takes effect within a minute, and in return a burst of API calls
# from one open tab costs one round trip to Supabase Auth plus one table read,
# not one of each per call.
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


def _verify_token(token: str) -> tuple[str, str, str]:
    """
    Ask Supabase Auth who this token belongs to; returns (id, email, name).
    401 if it cannot say. The name is Google's display name, or the email.
    """
    try:
        result = _auth_client().auth.get_user(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired session")

    user = getattr(result, "user", None)
    if user is None or not getattr(user, "email", None):
        raise HTTPException(status_code=401, detail="Invalid or expired session")

    email = user.email.lower()
    meta = getattr(user, "user_metadata", None) or {}
    name = _str(meta.get("full_name")) or _str(meta.get("name")) or email
    return str(user.id), email, name


def _lookup(email: str) -> dict | None:
    """
    The `allowed_users` row for this email, or None if it isn't listed.

    Selects `*` rather than naming `is_admin` so the app keeps working on a
    database where the `is_admin` migration hasn't run yet — the column is then
    simply absent and everyone reads as a non-admin until it is applied.
    """
    response = (
        table("allowed_users").select("*").eq("email", email).limit(1).execute()
    )
    return response.data[0] if response.data else None


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
        uid, email, name = _verify_token(token)
    except HTTPException:
        return None

    row = _lookup(email)
    user = (
        AuthUser(id=uid, email=email, name=name, is_admin=bool(row["is_admin"]))
        if row
        else None
    )
    _cache_put(token, user)
    return user


def clear_cache() -> None:
    """
    Drop every cached verification. Called after an allowlist edit so a removed
    user loses access now rather than up to a minute later.
    """
    _CACHE.clear()


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

    # A cache hit for `None` could mean either "bad token" or "not allowed", so
    # an uncached token is verified once more here to tell 401 from 403.
    cached, user = _cache_get(token)
    if cached:
        if user is None:
            raise HTTPException(status_code=403, detail=NOT_AUTHORIZED_DETAIL)
        return user

    uid, email, name = _verify_token(token)
    row = _lookup(email)
    if row is None:
        _cache_put(token, None)
        raise HTTPException(status_code=403, detail=NOT_AUTHORIZED_DETAIL)

    user = AuthUser(id=uid, email=email, name=name, is_admin=bool(row["is_admin"]))
    _cache_put(token, user)
    return user


def require_admin(user: AuthUser = Depends(require_user)) -> AuthUser:
    """On top of `require_user`: the account's `is_admin` flag must be set."""
    if not user.is_admin:
        raise HTTPException(status_code=403, detail=NOT_ADMIN_DETAIL)
    return user
