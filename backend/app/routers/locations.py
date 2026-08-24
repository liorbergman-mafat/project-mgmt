from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter

from ..repository import first_or_404, payload, require_non_empty, rows, table
from ..schemas import Location, LocationCreate, LocationUpdate

router = APIRouter(prefix="/api/locations", tags=["locations"])


@router.get("", response_model=list[Location])
def list_locations() -> list[Location]:
    response = table("locations").select("*").order("name").execute()
    return [Location(**row) for row in rows(response)]


@router.post("", response_model=Location, status_code=201)
def create_location(body: LocationCreate) -> Location:
    response = table("locations").insert(payload(body, partial=True)).execute()
    return Location(**first_or_404(response, "Location was not created"))


@router.get("/{location_id}", response_model=Location)
def get_location(location_id: UUID) -> Location:
    response = table("locations").select("*").eq("id", str(location_id)).execute()
    return Location(**first_or_404(response, "Location not found"))


@router.patch("/{location_id}", response_model=Location)
def update_location(location_id: UUID, body: LocationUpdate) -> Location:
    data = payload(body, partial=True)
    require_non_empty(data)
    response = table("locations").update(data).eq("id", str(location_id)).execute()
    return Location(**first_or_404(response, "Location not found"))


@router.delete("/{location_id}", status_code=204, response_model=None)
def delete_location(location_id: UUID) -> None:
    """Blocked by the database if the location is still referenced by an item, loan, or feedback entry."""
    first_or_404(
        table("locations").select("id").eq("id", str(location_id)).execute(),
        "Location not found",
    )
    table("locations").delete().eq("id", str(location_id)).execute()
