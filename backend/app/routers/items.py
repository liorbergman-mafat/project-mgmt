from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter

from ..repository import first_or_404, payload, require_non_empty, rows, table
from ..schemas import Item, ItemCreate, ItemUpdate

# PostgREST embedded select: pull the type/model/status/location rows
# alongside the item, so the UI never has to stitch names together itself.
ITEM_SELECT = (
    "*, type:item_types(*), model:item_models(*), "
    "status:item_statuses(*), location:locations(*)"
)

router = APIRouter(prefix="/api/items", tags=["items"])


@router.get("", response_model=list[Item])
def list_items(
    project_id: UUID | None = None,
    location_id: UUID | None = None,
    type_id: UUID | None = None,
    model_id: UUID | None = None,
    status_id: UUID | None = None,
) -> list[Item]:
    query = table("items").select(ITEM_SELECT).order("created_at", desc=True)
    if project_id:
        query = query.eq("project_id", str(project_id))
    if location_id:
        query = query.eq("location_id", str(location_id))
    if type_id:
        query = query.eq("type_id", str(type_id))
    if model_id:
        query = query.eq("model_id", str(model_id))
    if status_id:
        query = query.eq("status_id", str(status_id))
    return [Item(**row) for row in rows(query.execute())]


@router.post("", response_model=Item, status_code=201)
def create_item(body: ItemCreate) -> Item:
    created = first_or_404(
        table("items").insert(payload(body, partial=True)).execute(),
        "Item was not created",
    )
    return _fetch(created["id"])


@router.get("/{item_id}", response_model=Item)
def get_item(item_id: UUID) -> Item:
    return _fetch(str(item_id))


@router.patch("/{item_id}", response_model=Item)
def update_item(item_id: UUID, body: ItemUpdate) -> Item:
    data = payload(body, partial=True)
    require_non_empty(data)
    first_or_404(
        table("items").update(data).eq("id", str(item_id)).execute(),
        "Item not found",
    )
    return _fetch(str(item_id))


@router.delete("/{item_id}", status_code=204, response_model=None)
def delete_item(item_id: UUID) -> None:
    """Deletes the item and, by cascade, its loan history."""
    first_or_404(
        table("items").select("id").eq("id", str(item_id)).execute(),
        "Item not found",
    )
    table("items").delete().eq("id", str(item_id)).execute()


def _fetch(item_id: str) -> Item:
    response = table("items").select(ITEM_SELECT).eq("id", item_id).execute()
    return Item(**first_or_404(response, "Item not found"))
