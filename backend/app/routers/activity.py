"""Reading the activity log. Writing it is the middleware's job — see activity.py."""

from __future__ import annotations

from fastapi import APIRouter, Query

from ..repository import rows, table
from ..schemas import ActivityEntry

router = APIRouter(prefix="/api/activity", tags=["activity"])


@router.get("", response_model=list[ActivityEntry])
def list_activity(limit: int = Query(default=300, ge=1, le=2000)) -> list[ActivityEntry]:
    """The most recent actions, newest first."""
    response = (
        table("activity_log")
        .select("*")
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return [ActivityEntry(**row) for row in rows(response)]
