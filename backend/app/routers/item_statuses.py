from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter

from ..repository import first_or_404, payload, require_non_empty, rows, table
from ..schemas import ItemStatus, ItemStatusCreate, ItemStatusUpdate

router = APIRouter(prefix="/api/item-statuses", tags=["item-statuses"])


@router.get("", response_model=list[ItemStatus])
def list_item_statuses() -> list[ItemStatus]:
    response = table("item_statuses").select("*").order("name").execute()
    return [ItemStatus(**row) for row in rows(response)]


@router.post("", response_model=ItemStatus, status_code=201)
def create_item_status(body: ItemStatusCreate) -> ItemStatus:
    response = table("item_statuses").insert(payload(body)).execute()
    return ItemStatus(**first_or_404(response, "Status was not created"))


@router.patch("/{status_id}", response_model=ItemStatus)
def update_item_status(status_id: UUID, body: ItemStatusUpdate) -> ItemStatus:
    data = payload(body, partial=True)
    require_non_empty(data)
    response = table("item_statuses").update(data).eq("id", str(status_id)).execute()
    return ItemStatus(**first_or_404(response, "Status not found"))


@router.delete("/{status_id}", status_code=204, response_model=None)
def delete_item_status(status_id: UUID) -> None:
    """Blocked by the database if any item still uses this status."""
    first_or_404(
        table("item_statuses").select("id").eq("id", str(status_id)).execute(),
        "Status not found",
    )
    table("item_statuses").delete().eq("id", str(status_id)).execute()
