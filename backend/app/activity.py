"""
The activity log: who changed what, recorded for the "פעולות" screen.

This is middleware rather than a call inside each router on purpose — a log
that every new endpoint has to remember to write to is a log with holes in it.
Sitting in front of the whole API, it sees every change by construction.

What it records is deliberately small and stable: a key for the kind of action
("create"), a key for the kind of record ("locations"), and *snapshots* of the
acting user's email and the record's name. The frontend turns the two keys into
Hebrew; the snapshots mean an entry still reads correctly after the row it
describes has been deleted.
"""

from __future__ import annotations

import json
from typing import Any
from urllib.parse import unquote
from uuid import UUID

from starlette.concurrency import run_in_threadpool
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from . import auth
from .repository import rows, table

# Reads change nothing, so they are not worth a row apiece.
TRACKED_METHODS = {"POST", "PATCH", "PUT", "DELETE"}

# The exception: pulling the contacts directory is a bulk read of names,
# phone numbers and personal numbers. It changes nothing, but it is exactly
# the request worth being able to account for afterwards.
AUDITED_READS = {"contacts"}

# The URL segment after /api/ → the table it writes to. An endpoint whose
# segment is not here (health, the log's own read endpoint) is not recorded.
TABLE_BY_ENTITY: dict[str, str] = {
    "projects": "projects",
    "items": "items",
    "item-types": "item_types",
    "item-models": "item_models",
    "locations": "locations",
    "contacts": "contacts",
    "loans": "loans",
    "feedback": "feedback",
    "allowed-users": "allowed_users",
}

ACTION_BY_METHOD = {"POST": "create", "PATCH": "update", "PUT": "update", "DELETE": "delete"}

# Endpoints that end in a word rather than an id do something more specific
# than their HTTP verb says.
ACTION_BY_VERB = {
    "archive": "archive",
    "unarchive": "unarchive",
    "return": "return",
}

# Tried in order against a record to find the one field worth showing as its
# name. Whatever the record calls itself, one of these is it.
LABEL_COLUMNS = ("name", "full_name", "email", "serial_id", "content")

# A label is a glance, not the record — long free text is cut down.
LABEL_MAX = 80


class ActivityMiddleware(BaseHTTPMiddleware):
    """Records each successful change; never gets in the way of one."""

    async def dispatch(self, request: Request, call_next) -> Response:
        entry = _describe(request)

        if entry is not None:
            # Resolving the actor hits Supabase Auth (see auth.py) — off the
            # event loop, and never fatal to the request being logged.
            entry["actor"] = await _safely(_actor, request)

            # A delete leaves nothing to read afterwards, so the record's name
            # has to be taken while the row still exists.
            if entry["action"] == "delete" and entry["entity_id"]:
                entry["label"] = await _safely(_label_from_db, entry["entity"], entry["entity_id"])

        response = await call_next(request)

        # Only a change that actually went through is an action that happened.
        if entry is None or not 200 <= response.status_code < 300:
            return response

        body, response = await _buffer(response)
        _fill_from_response(entry, body)
        await _safely(_record, entry)
        return response


def _describe(request: Request) -> dict[str, Any] | None:
    """
    What this request is about, read off its method and path, or None if it is
    not the kind of request the log covers.

    Paths look like /api/<entity>[/<id>][/<verb>]; the pieces present decide
    both the action and whether the target is already known by id.
    """
    parts = [part for part in request.url.path.split("/") if part]
    if len(parts) < 2 or parts[0] != "api":
        return None

    entity = parts[1]
    if entity not in TABLE_BY_ENTITY:
        return None

    tail = parts[2:]
    entity_id = next((part for part in tail if _is_uuid(part)), None)
    verb = next((part for part in reversed(tail) if not _is_uuid(part)), None)

    # A trailing segment that is neither an id nor a known verb identifies the
    # target directly — an email in /api/allowed-users/<email>, say. Keep it as
    # the label (so a delete still says which row), and let the HTTP method
    # decide the action.
    seed_label: str | None = None
    if verb and verb not in ACTION_BY_VERB:
        seed_label = unquote(verb)
        verb = None

    if request.method == "GET":
        # Only the bulk directory read, not a single record fetched to fill
        # in a screen — one row at a time is ordinary browsing.
        if entity not in AUDITED_READS or entity_id:
            return None
        action = "read"
    elif request.method in TRACKED_METHODS:
        action = ACTION_BY_VERB.get(verb) if verb else ACTION_BY_METHOD.get(request.method)
    else:
        return None

    if action is None:
        return None

    return {
        "actor": None,  # filled in by the middleware, off the event loop
        "action": action,
        "entity": entity,
        "entity_id": entity_id,
        "label": seed_label,
    }


def _actor(request: Request) -> str | None:
    """
    Who is asking, resolved from the Bearer token against Supabase Auth and the
    allowlist (see auth.py), as "Name (email)".

    Never from a header the caller controls: the log's whole value is that an
    entry can be relied on, and a supplied name can be anything at all — an
    empty one, or a colleague's.
    """
    user = auth.user_for_header(request.headers.get("authorization", ""))
    return user.actor if user else None


async def _buffer(response: Response) -> tuple[bytes, Response]:
    """
    Read the response body so its fields can be logged, and hand back a fresh
    response carrying the same bytes — a streamed body can only be read once.
    """
    chunks = [chunk async for chunk in response.body_iterator]
    body = b"".join(chunks)
    return body, Response(
        content=body,
        status_code=response.status_code,
        headers=dict(response.headers),
        media_type=response.media_type,
    )


def _fill_from_response(entry: dict[str, Any], body: bytes) -> None:
    """Take the id and name of whatever was created or changed off the reply."""
    if not body:
        return
    try:
        data = json.loads(body)
    except (ValueError, UnicodeDecodeError):
        return
    if not isinstance(data, dict):
        return

    if not entry["entity_id"] and _is_uuid(str(data.get("id", ""))):
        entry["entity_id"] = data["id"]
    if not entry["label"]:
        entry["label"] = _label_of(data)


def _label_from_db(entity: str, entity_id: str) -> str | None:
    response = table(TABLE_BY_ENTITY[entity]).select("*").eq("id", entity_id).limit(1).execute()
    found = rows(response)
    return _label_of(found[0]) if found else None


def _label_of(row: dict[str, Any]) -> str | None:
    for column in LABEL_COLUMNS:
        value = row.get(column)
        if isinstance(value, str) and value.strip():
            trimmed = value.strip()
            return trimmed if len(trimmed) <= LABEL_MAX else trimmed[: LABEL_MAX - 1] + "…"
    return None


def _record(entry: dict[str, Any]) -> None:
    table("activity_log").insert(entry).execute()


def record_login(actor: str | None) -> None:
    """
    Write one "login" row. The backend never sees the Google OAuth round-trip,
    so the frontend calls POST /api/auth/session once per browser session and
    this records it. Best-effort — a failed log never fails the request.
    """
    try:
        table("activity_log").insert(
            {"actor": actor, "action": "login", "entity": "auth"}
        ).execute()
    except Exception:  # noqa: BLE001 — a broken log must not break sign-in
        pass


def _is_uuid(value: str) -> bool:
    try:
        UUID(value)
    except (ValueError, AttributeError, TypeError):
        return False
    return True


async def _safely(fn, *args):
    """
    Run one of the log's own database calls off the event loop, swallowing any
    failure: the log is a record of the user's work, never a gate on it.
    """
    try:
        return await run_in_threadpool(fn, *args)
    except Exception:  # noqa: BLE001 — a broken log must not break the request
        return None
