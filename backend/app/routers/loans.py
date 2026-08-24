from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter

from ..repository import first_or_404, payload, require_non_empty, rows, table
from ..schemas import Loan, LoanCreate, LoanStatus, LoanUpdate
from .items import ITEM_SELECT

# PostgREST embedded select: pull the item (with its own type/model/status/
# location) and the loan's destination location, so the UI never has to
# stitch names together itself.
LOAN_SELECT = f"*, item:items({ITEM_SELECT}), location:locations(*)"

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
    created = first_or_404(
        table("loans").insert(payload(body, partial=True)).execute(),
        "Loan was not created",
    )
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
    """Mark a loan as returned, stamping the return time as now."""
    first_or_404(
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
    return _fetch(str(loan_id))


@router.delete("/{loan_id}", status_code=204, response_model=None)
def delete_loan(loan_id: UUID) -> None:
    first_or_404(
        table("loans").select("id").eq("id", str(loan_id)).execute(),
        "Loan not found",
    )
    table("loans").delete().eq("id", str(loan_id)).execute()


def _fetch(loan_id: str) -> Loan:
    """Re-read with the embedded item/location, which insert/update do not return."""
    response = table("loans").select(LOAN_SELECT).eq("id", loan_id).execute()
    return Loan(**first_or_404(response, "Loan not found"))
