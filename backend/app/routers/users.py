"""
Who may sign in, and the sign-in check itself.

Passwords are hashed (security.py) and stay on the server; sign-in hands back
a signed session token (tokens.py) that every later request carries. Managing
accounts is administrator work — see the `require_admin` dependencies below —
and changing a password is either an administrator resetting someone else's or
a user changing their own with the current one in hand.
"""

from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from .. import tokens
from ..config import get_settings
from ..deps import NOT_ADMIN, current_user, require_admin
from ..repository import first_or_404, payload, require_non_empty, rows, table
from ..schemas import (
    LoginRequest,
    LoginResponse,
    PasswordChange,
    User,
    UserCreate,
    UserUpdate,
)
from ..security import hash_password, verify_password

# Everything but password_hash — the hash must never reach a response.
USER_COLUMNS = "id, username, full_name, role, is_active, last_login_at, created_at, updated_at"

# One message for a wrong username and a wrong password alike: saying which
# half was wrong tells a stranger which usernames exist.
INVALID_CREDENTIALS = "שם המשתמש או הסיסמה שגויים."
DISABLED_ACCOUNT = "המשתמש מושבת. יש לפנות למנהל המערכת."
WRONG_CURRENT_PASSWORD = "הסיסמה הנוכחית שגויה."

# Twelve is the length at which a memorable passphrase beats a guessable word.
# The ceiling is not a security limit — PBKDF2 hashes the input directly, so
# an unbounded password turns one unauthenticated request into minutes of CPU.
MIN_PASSWORD = 12
MAX_PASSWORD = 128

# Eight failures in a quarter of an hour is far past a typo and far short of a
# brute force. The window slides, so a locked-out user waits it out rather than
# needing an administrator to intervene.
LOCKOUT_WINDOW = timedelta(minutes=15)
LOCKOUT_AFTER = 8
LOCKED_OUT = "יותר מדי ניסיונות התחברות. נסו שוב בעוד רבע שעה."

router = APIRouter(prefix="/api/users", tags=["users"])
auth_router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.get("", response_model=list[User], dependencies=[Depends(require_admin)])
def list_users() -> list[User]:
    response = table("users").select(USER_COLUMNS).order("username").execute()
    return [User(**row) for row in rows(response)]


@router.post(
    "", response_model=User, status_code=201, dependencies=[Depends(require_admin)]
)
def create_user(body: UserCreate) -> User:
    _require_password(body.password)
    data = payload(body)
    data["username"] = data["username"].strip()
    data["password_hash"] = hash_password(data.pop("password"))
    response = table("users").insert(data).execute()
    return _fetch(first_or_404(response, "User was not created")["id"])


@router.patch(
    "/{user_id}", response_model=User, dependencies=[Depends(require_admin)]
)
def update_user(user_id: UUID, body: UserUpdate) -> User:
    data = payload(body, partial=True)
    # partial mode drops None fields, which is right for "untouched" — but
    # full_name is the one field the form can legitimately clear.
    if "full_name" in body.model_fields_set and body.full_name is None:
        data["full_name"] = None
    require_non_empty(data)
    if "username" in data:
        data["username"] = data["username"].strip()
    first_or_404(
        table("users").update(data).eq("id", str(user_id)).execute(),
        "User not found",
    )
    return _fetch(str(user_id))


@router.post("/{user_id}/password", response_model=User)
def set_password(
    user_id: UUID,
    body: PasswordChange,
    actor: dict = Depends(current_user),
) -> User:
    """
    Change a password.

    An administrator may reset anyone's — that is what recovery looks like
    here, since there is no email round trip. Anyone else may change only
    their own, and has to prove they know the current one, so a screen left
    unlocked is not an account takeover.
    """
    is_self = str(user_id) == str(actor["id"])
    is_admin = actor["role"] == "admin"

    if not is_self and not is_admin:
        raise HTTPException(status_code=403, detail=NOT_ADMIN)

    if is_self and not is_admin:
        stored = first_or_404(
            table("users").select("password_hash").eq("id", str(user_id)).execute(),
            "User not found",
        )
        _require_length(body.current_password or "")
        if not verify_password(body.current_password or "", stored["password_hash"]):
            raise HTTPException(status_code=403, detail=WRONG_CURRENT_PASSWORD)

    _require_password(body.password)
    first_or_404(
        table("users")
        .update({"password_hash": hash_password(body.password)})
        .eq("id", str(user_id))
        .execute(),
        "User not found",
    )
    return _fetch(str(user_id))


@router.delete(
    "/{user_id}",
    status_code=204,
    response_model=None,
    dependencies=[Depends(require_admin)],
)
def delete_user(user_id: UUID) -> None:
    """
    Removes the account. The last one cannot go — an empty users table locks
    everyone out, since adding a user is itself something you sign in to do.
    """
    first_or_404(
        table("users").select("id").eq("id", str(user_id)).execute(),
        "User not found",
    )
    if len(rows(table("users").select("id").limit(2).execute())) < 2:
        raise HTTPException(
            status_code=409,
            detail="לא ניתן למחוק את המשתמש האחרון במערכת.",
        )
    table("users").delete().eq("id", str(user_id)).execute()


@auth_router.post("/login", response_model=LoginResponse)
def login(body: LoginRequest) -> LoginResponse:
    """Checks a username/password pair and issues a session token."""
    _bootstrap()

    typed = _normalize(body.username)
    if _locked_out(typed):
        raise HTTPException(status_code=429, detail=LOCKED_OUT)

    # An oversized candidate is refused before it costs a PBKDF2 run.
    if len(body.password or "") > MAX_PASSWORD:
        _record_attempt(typed, False)
        raise HTTPException(status_code=401, detail=INVALID_CREDENTIALS)

    found = rows(
        table("users").select("*").eq("username_normalized", typed).limit(1).execute()
    )
    match = found[0] if found else None

    if match is None or not verify_password(body.password, match.get("password_hash") or ""):
        _record_attempt(typed, False)
        raise HTTPException(status_code=401, detail=INVALID_CREDENTIALS)
    if not match["is_active"]:
        _record_attempt(typed, False)
        raise HTTPException(status_code=403, detail=DISABLED_ACCOUNT)

    _record_attempt(typed, True)
    table("users").update(
        {"last_login_at": datetime.now(timezone.utc).isoformat()}
    ).eq("id", match["id"]).execute()
    return LoginResponse(token=tokens.issue(match), user=_fetch(match["id"]))


def _locked_out(username: str) -> bool:
    """True once the recent run of attempts is nothing but failures."""
    since = (datetime.now(timezone.utc) - LOCKOUT_WINDOW).isoformat()
    recent = rows(
        table("login_attempts")
        .select("succeeded")
        .eq("username", username)
        .gte("created_at", since)
        .order("created_at", desc=True)
        .limit(LOCKOUT_AFTER)
        .execute()
    )
    # A success anywhere in the window clears it: the owner got in.
    return len(recent) >= LOCKOUT_AFTER and not any(a["succeeded"] for a in recent)


def _record_attempt(username: str, succeeded: bool) -> None:
    table("login_attempts").insert(
        {"username": username, "succeeded": succeeded}
    ).execute()


def _bootstrap() -> None:
    """
    Create the first administrator, once, on an empty users table.

    The credentials come from the environment rather than from this file: a
    password committed to a repository is a password known to everyone who can
    read it. With either variable unset this does nothing at all.
    """
    settings = get_settings()
    if not settings.bootstrap_username or not settings.bootstrap_password:
        return
    if rows(table("users").select("id").limit(1).execute()):
        return
    table("users").insert(
        {
            "username": settings.bootstrap_username.strip(),
            "role": "admin",
            "is_active": True,
            "password_hash": hash_password(settings.bootstrap_password),
        }
    ).execute()


def _normalize(value: str) -> str:
    """
    Collapses whitespace and case, so a stray double space still matches.

    Must stay in step with set_username_normalized() in schema.sql, which is
    what actually fills the column this is compared against — hence lower()
    rather than casefold(), which is what Postgres does and which differs on
    characters like "ß".
    """
    return re.sub(r"\s+", " ", value or "").strip().lower()


def _require_password(password: str) -> None:
    """The rules a *new* password has to meet."""
    if len(password or "") < MIN_PASSWORD:
        raise HTTPException(
            status_code=400,
            detail=f"הסיסמה חייבת להכיל לפחות {MIN_PASSWORD} תווים.",
        )
    _require_length(password)


def _require_length(password: str) -> None:
    """The ceiling, which applies to any password we are about to hash."""
    if len(password or "") > MAX_PASSWORD:
        raise HTTPException(status_code=400, detail="הסיסמה ארוכה מדי.")


def _fetch(user_id: str) -> User:
    response = table("users").select(USER_COLUMNS).eq("id", user_id).execute()
    return User(**first_or_404(response, "User not found"))
