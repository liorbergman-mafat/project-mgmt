"""
Who is asking.

Every router hangs off `current_user`, so nothing in this API is reachable
without a valid session token. The one exception is `/api/auth/login`, which
is the door those tokens come from.
"""

from __future__ import annotations

from typing import Any

from fastapi import Depends, Header, HTTPException

from . import tokens
from .repository import rows, table

NOT_SIGNED_IN = "נדרשת התחברות."
NOT_ADMIN = "הפעולה מותרת למנהלי מערכת בלבד."


def current_user(authorization: str = Header(default="")) -> dict[str, Any]:
    """
    The signed-in user, re-read from the database on every request.

    Re-reading rather than trusting the token is the point: it costs one
    indexed lookup and it means disabling or deleting an account ends its
    sessions immediately, instead of whenever the token happens to expire.
    """
    payload = tokens.from_header(authorization)
    if payload is None:
        raise HTTPException(status_code=401, detail=NOT_SIGNED_IN)

    found = rows(
        table("users")
        .select("id, username, role, is_active")
        .eq("id", payload["sub"])
        .limit(1)
        .execute()
    )
    # Deleted or disabled since the token was issued — the token outlives the
    # account, so the account is what decides.
    if not found or not found[0]["is_active"]:
        raise HTTPException(status_code=401, detail=NOT_SIGNED_IN)
    return found[0]


def require_admin(user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    """For the things only an administrator may do: accounts, and the log."""
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail=NOT_ADMIN)
    return user
