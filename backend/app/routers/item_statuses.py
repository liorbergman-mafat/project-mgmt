from __future__ import annotations

from fastapi import APIRouter

from ..repository import rows, table
from ..schemas import ItemStatus

router = APIRouter(prefix="/api/item-statuses", tags=["item-statuses"])


@router.get("", response_model=list[ItemStatus])
def list_item_statuses() -> list[ItemStatus]:
    """
    Read-only: statuses are a fixed list seeded into the database, not
    something the app lets anyone add to or rename.
    """
    response = table("item_statuses").select("*").order("name").execute()
    return [ItemStatus(**row) for row in rows(response)]
