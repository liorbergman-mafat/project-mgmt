from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter

from ..repository import first_or_404, payload, require_non_empty, rows, table
from ..schemas import Feedback, FeedbackCreate, FeedbackUpdate
from .loans import LOAN_SELECT

# Include the loan (and through it, the item) so a feedback entry can say
# which loaned item it is about, not just which location wrote it.
FEEDBACK_SELECT = f"*, location:locations(*), loan:loans({LOAN_SELECT})"

router = APIRouter(prefix="/api/feedback", tags=["feedback"])


@router.get("", response_model=list[Feedback])
def list_feedback(
    project_id: UUID | None = None,
    location_id: UUID | None = None,
    loan_id: UUID | None = None,
) -> list[Feedback]:
    query = table("feedback").select(FEEDBACK_SELECT).order("feedback_at", desc=True)

    if project_id:
        query = query.eq("project_id", str(project_id))
    if location_id:
        query = query.eq("location_id", str(location_id))
    if loan_id:
        query = query.eq("loan_id", str(loan_id))

    return [Feedback(**row) for row in rows(query.execute())]


@router.post("", response_model=Feedback, status_code=201)
def create_feedback(body: FeedbackCreate) -> Feedback:
    created = first_or_404(
        table("feedback").insert(payload(body, partial=True)).execute(),
        "Feedback was not created",
    )
    return _fetch(created["id"])


@router.get("/{feedback_id}", response_model=Feedback)
def get_feedback(feedback_id: UUID) -> Feedback:
    return _fetch(str(feedback_id))


@router.patch("/{feedback_id}", response_model=Feedback)
def update_feedback(feedback_id: UUID, body: FeedbackUpdate) -> Feedback:
    data = payload(body, partial=True)
    require_non_empty(data)
    first_or_404(
        table("feedback").update(data).eq("id", str(feedback_id)).execute(),
        "Feedback not found",
    )
    return _fetch(str(feedback_id))


# response_model=None is required: `from __future__ import annotations` makes the
# `-> None` return hint resolve to the NoneType *class*, which FastAPI would
# otherwise treat as a real response model and reject on a 204.
@router.delete("/{feedback_id}", status_code=204, response_model=None)
def delete_feedback(feedback_id: UUID) -> None:
    first_or_404(
        table("feedback").select("id").eq("id", str(feedback_id)).execute(),
        "Feedback not found",
    )
    table("feedback").delete().eq("id", str(feedback_id)).execute()


def _fetch(feedback_id: str) -> Feedback:
    response = table("feedback").select(FEEDBACK_SELECT).eq("id", feedback_id).execute()
    return Feedback(**first_or_404(response, "Feedback not found"))
