from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter

from ..repository import first_or_404, payload, require_non_empty, rows, table
from ..schemas import ItemModel, ItemModelCreate, ItemModelUpdate

router = APIRouter(prefix="/api/item-models", tags=["item-models"])


@router.get("", response_model=list[ItemModel])
def list_item_models(type_id: UUID | None = None) -> list[ItemModel]:
    query = table("item_models").select("*").order("name")
    if type_id:
        query = query.eq("type_id", str(type_id))
    return [ItemModel(**row) for row in rows(query.execute())]


@router.post("", response_model=ItemModel, status_code=201)
def create_item_model(body: ItemModelCreate) -> ItemModel:
    response = table("item_models").insert(payload(body)).execute()
    return ItemModel(**first_or_404(response, "Model was not created"))


@router.patch("/{model_id}", response_model=ItemModel)
def update_item_model(model_id: UUID, body: ItemModelUpdate) -> ItemModel:
    data = payload(body, partial=True)
    require_non_empty(data)
    response = table("item_models").update(data).eq("id", str(model_id)).execute()
    return ItemModel(**first_or_404(response, "Model not found"))


@router.delete("/{model_id}", status_code=204, response_model=None)
def delete_item_model(model_id: UUID) -> None:
    """Blocked by the database if any item still uses this model."""
    first_or_404(
        table("item_models").select("id").eq("id", str(model_id)).execute(),
        "Model not found",
    )
    table("item_models").delete().eq("id", str(model_id)).execute()
