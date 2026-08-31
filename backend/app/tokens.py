"""
Signed session tokens for the `users` table.

Standard library only, in the same spirit as security.py. A token looks like

    <base64url payload>.<base64url signature>

where the signature is HMAC-SHA256 over the payload under SESSION_SECRET. The
payload is readable by anyone holding the token and that is fine — it carries
no secret. What it cannot be is *forged*, which is the whole job.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
from datetime import datetime, timedelta, timezone
from typing import Any

from .config import get_settings

# Long enough to cover a working day without a second sign-in, short enough
# that a token copied off a shared machine stops working the same evening.
TTL = timedelta(hours=12)


def issue(user: dict[str, Any]) -> str:
    """A fresh token for a user row that has just passed the password check."""
    payload = {
        "sub": str(user["id"]),
        "username": user["username"],
        "exp": int((datetime.now(timezone.utc) + TTL).timestamp()),
    }
    raw = _b64(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    return f"{raw}.{_sign(raw)}"


def verify(token: str) -> dict[str, Any] | None:
    """
    The payload, or None for anything we did not sign or that has expired.

    Note what is *not* here: the user's role. Roles change, tokens do not, so
    authorisation reads the database instead (see deps.py).
    """
    try:
        raw, signature = token.split(".")
    except (AttributeError, ValueError):
        return None
    # Constant time, so a signature cannot be guessed a byte at a time.
    if not hmac.compare_digest(_sign(raw), signature):
        return None
    try:
        payload = json.loads(_unb64(raw))
    except (ValueError, UnicodeDecodeError):
        return None
    if not isinstance(payload, dict) or "sub" not in payload:
        return None
    if payload.get("exp", 0) < datetime.now(timezone.utc).timestamp():
        return None
    return payload


def from_header(authorization: str) -> dict[str, Any] | None:
    """
    The payload behind an `Authorization: Bearer <token>` header, if valid.

    One place that knows the header format, so the dependency and the activity
    log cannot drift apart on how they read it.
    """
    scheme, _, token = (authorization or "").partition(" ")
    return verify(token) if scheme.lower() == "bearer" else None


def _sign(raw: str) -> str:
    secret = get_settings().session_secret.encode("utf-8")
    return _b64(hmac.new(secret, raw.encode("utf-8"), hashlib.sha256).digest())


def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _unb64(value: str) -> bytes:
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))
