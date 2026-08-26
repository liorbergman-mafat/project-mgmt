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

# The "add equipment" form asks for category, serial, project and optionally
# a model, but items.status_id / items.location_id are not null. New
# equipment has not been loaned anywhere yet, so it starts off in the
# warehouse: these two rows are looked up by name and created on first use,
# then reused from then on.
DEFAULT_STATUS_NAME = "במחסן"
DEFAULT_LOCATION_NAME = "מחסן"
DEFAULT_LOCATION_KIND = "מחסן"

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
    data = payload(body, partial=True)
    data.setdefault("status_id", _default_status_id())
    data.setdefault("location_id", _default_location_id())
    created = first_or_404(
        table("items").insert(data).execute(),
        "Item was not created",
    )
    return _fetch(created["id"])


@router.get("/{item_id}", response_model=Item)
def get_item(item_id: UUID) -> Item:
    return _fetch(str(item_id))


@router.patch("/{item_id}", response_model=Item)
def update_item(item_id: UUID, body: ItemUpdate) -> Item:
    data = payload(body, partial=True)
    # payload()'s partial mode drops None fields entirely, which is right for
    # "untouched" fields but would silently ignore clearing model_id back to
    # "no model" — put it back if the caller actually sent it.
    if "model_id" in body.model_fields_set and body.model_id is None:
        data["model_id"] = None
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


def _default_status_id() -> str:
    return _id_by_name("item_statuses", {"name": DEFAULT_STATUS_NAME})


def _default_location_id() -> str:
    return _id_by_name(
        "locations",
        {"name": DEFAULT_LOCATION_NAME, "kind": DEFAULT_LOCATION_KIND},
    )


def _id_by_name(table_name: str, row: dict[str, str]) -> str:
    """The id of the row with this name, inserting it the first time around."""
    found = rows(table(table_name).select("id").eq("name", row["name"]).limit(1).execute())
    if found:
        return found[0]["id"]
    created = first_or_404(
        table(table_name).insert(row).execute(),
        f"Could not create the default {table_name} row",
    )
    return created["id"]


def _fetch(item_id: str) -> Item:
    response = table("items").select(ITEM_SELECT).eq("id", item_id).execute()
    return Item(**first_or_404(response, "Item not found"))
