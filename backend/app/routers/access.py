"""
The authorization allowlist, managed from the הרשאות screen.

Every row is an email that may use the app; `is_admin` marks who may edit this
list. The whole router sits behind `require_admin` — a non-admin never sees the
screen and cannot call these endpoints.
"""

from __future__ import annotations

import re

from fastapi import APIRouter, Depends, HTTPException

from ..auth import clear_cache, require_admin
from ..repository import rows, table
from ..schemas import AllowedUser, AllowedUserCreate, AllowedUserUpdate

router = APIRouter(
    prefix="/api/allowed-users",
    tags=["access"],
    dependencies=[Depends(require_admin)],
)

COLUMNS = "email, is_admin, note, created_at"
_EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
LAST_ADMIN = "לא ניתן להסיר את מנהל המערכת האחרון."


NOT_LISTED = "המשתמש לא נמצא ברשימה."


def _fetch(email: str) -> AllowedUser:
    found = rows(table("allowed_users").select(COLUMNS).eq("email", email).execute())
    if not found:
        raise HTTPException(status_code=404, detail=NOT_LISTED)
    return AllowedUser(**found[0])


def _admin_count() -> int:
    return len(rows(table("allowed_users").select("email").eq("is_admin", True).execute()))


@router.get("", response_model=list[AllowedUser])
def list_allowed() -> list[AllowedUser]:
    response = table("allowed_users").select(COLUMNS).order("email").execute()
    return [AllowedUser(**row) for row in rows(response)]


@router.post("", response_model=AllowedUser, status_code=201)
def add_allowed(body: AllowedUserCreate) -> AllowedUser:
    email = body.email.strip().lower()
    if not _EMAIL.match(email):
        raise HTTPException(status_code=400, detail="כתובת אימייל לא תקינה.")
    if rows(table("allowed_users").select("email").eq("email", email).execute()):
        raise HTTPException(status_code=409, detail="הכתובת כבר ברשימה.")

    table("allowed_users").insert(
        {"email": email, "is_admin": body.is_admin, "note": body.note}
    ).execute()
    clear_cache()
    return _fetch(email)


def _current(email: str) -> dict:
    found = rows(table("allowed_users").select("is_admin").eq("email", email).execute())
    if not found:
        raise HTTPException(status_code=404, detail=NOT_LISTED)
    return found[0]


@router.patch("/{email}", response_model=AllowedUser)
def update_allowed(email: str, body: AllowedUserUpdate) -> AllowedUser:
    target = email.strip().lower()
    data = body.model_dump(exclude_unset=True)
    if not data:
        raise HTTPException(status_code=400, detail="אין שינויים לשמירה.")

    current = _current(target)
    # Demoting the last admin locks the list for everyone.
    if data.get("is_admin") is False and current["is_admin"] and _admin_count() <= 1:
        raise HTTPException(status_code=409, detail=LAST_ADMIN)

    table("allowed_users").update(data).eq("email", target).execute()
    clear_cache()
    return _fetch(target)


@router.delete("/{email}", status_code=204, response_model=None)
def remove_allowed(email: str) -> None:
    target = email.strip().lower()
    current = _current(target)
    if current["is_admin"] and _admin_count() <= 1:
        raise HTTPException(status_code=409, detail=LAST_ADMIN)

    table("allowed_users").delete().eq("email", target).execute()
    clear_cache()
