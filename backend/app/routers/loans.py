from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, HTTPException

from ..repository import first_or_404, payload, require_non_empty, rows, table
from ..schemas import Loan, LoanCreate, LoanStatus, LoanUpdate
from .items import ITEM_SELECT, _default_location_id

# PostgREST embedded select: pull the item (with its own type/model/status/
# location), the loan's destination location, and the signing contact, so
# the UI never has to stitch names together itself.
LOAN_SELECT = f"*, item:items({ITEM_SELECT}), location:locations(*), signer:contacts(*)"

router = APIRouter(prefix="/api/loans", tags=["loans"])


@router.get("", response_model=list[Loan])
def list_loans(
    project_id: UUID | None = None,
    location_id: UUID | None = None,
    item_id: UUID | None = None,
    status: LoanStatus | None = None,
) -> list[Loan]:
    query = table("loans").select(LOAN_SELECT).order("loaned_at", desc=True)

    if project_id:
        query = query.eq("project_id", str(project_id))
    if location_id:
        query = query.eq("location_id", str(location_id))
    if item_id:
        query = query.eq("item_id", str(item_id))
    if status:
        query = query.eq("status", status)

    return [Loan(**row) for row in rows(query.execute())]


@router.post("", response_model=Loan, status_code=201)
def create_loan(body: LoanCreate) -> Loan:
    """
    Creates the loan record and, since an item can only be in one place at a
    time, moves the item itself to the loan's destination location. Blocked
    if the item is already out on an open loan — it has to be returned (or
    that loan deleted) first.
    """
    already_out = rows(
        table("loans")
        .select("id")
        .eq("item_id", str(body.item_id))
        .eq("status", "loaned")
        .execute()
    )
    if already_out:
        raise HTTPException(
            status_code=409,
            detail="הפריט הזה כבר מושאל ולא הוחזר — יש להחזיר אותו לפני השאלה מחדש.",
        )

    created = first_or_404(
        table("loans").insert(payload(body, partial=True)).execute(),
        "Loan was not created",
    )
    _move_item(str(body.item_id), str(body.location_id))
    return _fetch(created["id"])


@router.get("/{loan_id}", response_model=Loan)
def get_loan(loan_id: UUID) -> Loan:
    return _fetch(str(loan_id))


@router.patch("/{loan_id}", response_model=Loan)
def update_loan(loan_id: UUID, body: LoanUpdate) -> Loan:
    data = payload(body, partial=True)
    require_non_empty(data)
    first_or_404(
        table("loans").update(data).eq("id", str(loan_id)).execute(),
        "Loan not found",
    )
    return _fetch(str(loan_id))


@router.post("/{loan_id}/return", response_model=Loan)
def return_loan(loan_id: UUID) -> Loan:
    """Mark a loan as returned, stamping the return time as now, and send the item back to the warehouse."""
    updated = first_or_404(
        table("loans")
        .update(
            {
                "status": "returned",
                "returned_at": datetime.now(timezone.utc).isoformat(),
            }
        )
        .eq("id", str(loan_id))
        .execute(),
        "Loan not found",
    )
    _move_item(updated["item_id"], _default_location_id())
    return _fetch(str(loan_id))


@router.delete("/{loan_id}", status_code=204, response_model=None)
def delete_loan(loan_id: UUID) -> None:
    """Deleting an open loan also sends the item back to the warehouse — otherwise it would stay
    parked at the loan's location with nothing left explaining why."""
    existing = first_or_404(
        table("loans").select("id, item_id, status").eq("id", str(loan_id)).execute(),
        "Loan not found",
    )
    table("loans").delete().eq("id", str(loan_id)).execute()
    if existing["status"] == "loaned":
        _move_item(existing["item_id"], _default_location_id())


def _move_item(item_id: str, location_id: str) -> None:
    table("items").update({"location_id": location_id}).eq("id", item_id).execute()


def _fetch(loan_id: str) -> Loan:
    """Re-read with the embedded item/location, which insert/update do not return."""
    response = table("loans").select(LOAN_SELECT).eq("id", loan_id).execute()
    return Loan(**first_or_404(response, "Loan not found"))
