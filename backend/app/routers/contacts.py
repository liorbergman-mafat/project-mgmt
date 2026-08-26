from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter

from ..repository import first_or_404, payload, require_non_empty, rows, table
from ..schemas import Contact, ContactCreate, ContactUpdate

router = APIRouter(prefix="/api/contacts", tags=["contacts"])


@router.get("", response_model=list[Contact])
def list_contacts(location_id: UUID | None = None) -> list[Contact]:
    query = table("contacts").select("*").order("full_name")
    if location_id:
        query = query.eq("location_id", str(location_id))
    return [Contact(**row) for row in rows(query.execute())]


@router.post("", response_model=Contact, status_code=201)
def create_contact(body: ContactCreate) -> Contact:
    response = table("contacts").insert(payload(body, partial=True)).execute()
    return Contact(**first_or_404(response, "Contact was not created"))


@router.patch("/{contact_id}", response_model=Contact)
def update_contact(contact_id: UUID, body: ContactUpdate) -> Contact:
    data = payload(body, partial=True)
    require_non_empty(data)
    response = table("contacts").update(data).eq("id", str(contact_id)).execute()
    return Contact(**first_or_404(response, "Contact not found"))


@router.delete("/{contact_id}", status_code=204, response_model=None)
def delete_contact(contact_id: UUID) -> None:
    """Blocked by the database if the contact has signed for a loan."""
    first_or_404(
        table("contacts").select("id").eq("id", str(contact_id)).execute(),
        "Contact not found",
    )
    table("contacts").delete().eq("id", str(contact_id)).execute()
