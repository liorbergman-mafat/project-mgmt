"""
Who may sign in, and the sign-in check itself.

This replaces the credential list that used to ship inside the frontend
bundle: passwords are hashed (security.py) and stay on the server. It is still
not a session — the API remains open, and any caller can reach any endpoint
without signing in. What this does buy is a real user list, real password
changes, and a name to credit each recorded action to.
"""

from __future__ import annotations

import re
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, HTTPException

from ..repository import first_or_404, payload, require_non_empty, rows, table
from ..schemas import LoginRequest, PasswordChange, User, UserCreate, UserUpdate
from ..security import hash_password, verify_password

# Everything but password_hash — the hash must never reach a response.
USER_COLUMNS = "id, username, full_name, role, is_active, last_login_at, created_at, updated_at"

# The accounts created the first time anyone signs in — see _bootstrap below.
# These are the two pairs that used to be hardcoded in the browser bundle.
BOOTSTRAP_USERS = (
    ("ליאור ברגמן", "ליאור ברגמן"),
    ("חבר לבנוני", "Hever9764!"),
)

# One message for a wrong username and a wrong password alike: saying which
# half was wrong tells a stranger which usernames exist.
INVALID_CREDENTIALS = "שם המשתמש או הסיסמה שגויים."
DISABLED_ACCOUNT = "המשתמש מושבת. יש לפנות למנהל המערכת."

router = APIRouter(prefix="/api/users", tags=["users"])
auth_router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.get("", response_model=list[User])
def list_users() -> list[User]:
    response = table("users").select(USER_COLUMNS).order("username").execute()
    return [User(**row) for row in rows(response)]


@router.post("", response_model=User, status_code=201)
def create_user(body: UserCreate) -> User:
    _require_password(body.password)
    data = payload(body)
    data["username"] = data["username"].strip()
    data["password_hash"] = hash_password(data.pop("password"))
    response = table("users").insert(data).execute()
    return _fetch(first_or_404(response, "User was not created")["id"])


@router.patch("/{user_id}", response_model=User)
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
def set_password(user_id: UUID, body: PasswordChange) -> User:
    """
    Set a user's password outright.

    There is no "current password" step: with no session the API cannot tell
    who is asking, so a check against the *target* user's old password would
    only inconvenience an admin resetting it for someone who forgot theirs.
    """
    _require_password(body.password)
    first_or_404(
        table("users")
        .update({"password_hash": hash_password(body.password)})
        .eq("id", str(user_id))
        .execute(),
        "User not found",
    )
    return _fetch(str(user_id))


@router.delete("/{user_id}", status_code=204, response_model=None)
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


@auth_router.post("/login", response_model=User)
def login(body: LoginRequest) -> User:
    """Checks a username/password pair and stamps the user's last sign-in."""
    _bootstrap()

    typed = _normalize(body.username)
    match = next(
        (row for row in rows(table("users").select("*").execute())
         if _normalize(row["username"]) == typed),
        None,
    )
    if match is None or not verify_password(body.password, match.get("password_hash") or ""):
        raise HTTPException(status_code=401, detail=INVALID_CREDENTIALS)
    if not match["is_active"]:
        raise HTTPException(status_code=403, detail=DISABLED_ACCOUNT)

    table("users").update(
        {"last_login_at": datetime.now(timezone.utc).isoformat()}
    ).eq("id", match["id"]).execute()
    return _fetch(match["id"])


def _bootstrap() -> None:
    """
    Create the first accounts, once, on an empty users table.

    Adding a user is done from a screen you have to sign in to reach, so an
    empty table would leave nobody able to sign in and nobody able to fix it.
    These two accounts carry the passwords the frontend used to ship with —
    change them from the users screen after the first sign-in.
    """
    if rows(table("users").select("id").limit(1).execute()):
        return
    table("users").insert(
        [
            {
                "username": username,
                "role": "admin",
                "is_active": True,
                "password_hash": hash_password(password),
            }
            for username, password in BOOTSTRAP_USERS
        ]
    ).execute()


def _normalize(value: str) -> str:
    """Collapses whitespace and case, so a stray double space still matches."""
    return re.sub(r"\s+", " ", value or "").strip().casefold()


def _require_password(password: str) -> None:
    if len(password or "") < 4:
        raise HTTPException(status_code=400, detail="הסיסמה קצרה מדי.")


def _fetch(user_id: str) -> User:
    response = table("users").select(USER_COLUMNS).eq("id", user_id).execute()
    return User(**first_or_404(response, "User not found"))
