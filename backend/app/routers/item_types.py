from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter

from ..repository import first_or_404, payload, require_non_empty, rows, table
from ..schemas import ItemType, ItemTypeCreate, ItemTypeUpdate

router = APIRouter(prefix="/api/item-types", tags=["item-types"])


@router.get("", response_model=list[ItemType])
def list_item_types() -> list[ItemType]:
    response = table("item_types").select("*").order("name").execute()
    return [ItemType(**row) for row in rows(response)]


@router.post("", response_model=ItemType, status_code=201)
def create_item_type(body: ItemTypeCreate) -> ItemType:
    response = table("item_types").insert(payload(body)).execute()
    return ItemType(**first_or_404(response, "Type was not created"))


@router.patch("/{type_id}", response_model=ItemType)
def update_item_type(type_id: UUID, body: ItemTypeUpdate) -> ItemType:
    data = payload(body, partial=True)
    require_non_empty(data)
    response = table("item_types").update(data).eq("id", str(type_id)).execute()
    return ItemType(**first_or_404(response, "Type not found"))


@router.delete("/{type_id}", status_code=204, response_model=None)
def delete_item_type(type_id: UUID) -> None:
    """Blocked by the database if any model or item still uses this type."""
    first_or_404(
        table("item_types").select("id").eq("id", str(type_id)).execute(),
        "Type not found",
    )
    table("item_types").delete().eq("id", str(type_id)).execute()
