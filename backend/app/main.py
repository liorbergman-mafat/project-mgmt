from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from postgrest.exceptions import APIError

from .config import get_settings
from .routers import (
    contacts,
    feedback,
    item_models,
    item_statuses,
    item_types,
    items,
    loans,
    locations,
    projects,
)

settings = get_settings()

# Maps a foreign-key constraint name (Postgres' default "<table>_<column>_fkey"
# naming) to a Hebrew explanation of what is still pointing at the row the
# user tried to delete. Every "on delete restrict" FK in schema.sql needs an
# entry here, or its violation surfaces as a raw Postgres message instead.
FK_VIOLATION_MESSAGES: dict[str, str] = {
    "item_models_type_id_fkey": "לא ניתן למחוק סוג זה — קיימים דגמים המשויכים אליו.",
    "items_type_id_fkey": "לא ניתן למחוק סוג זה — קיימים פריטים מהסוג הזה.",
    "items_model_id_fkey": "לא ניתן למחוק דגם זה — קיימים פריטים מהדגם הזה.",
    "items_location_id_fkey": "לא ניתן למחוק מיקום זה — קיימים פריטים המשויכים אליו.",
    "loans_location_id_fkey": "לא ניתן למחוק מיקום זה — קיימות השאלות המשויכות אליו.",
    "feedback_location_id_fkey": "לא ניתן למחוק מיקום זה — קיים משוב המשויך אליו.",
    "loans_signer_contact_id_fkey": "לא ניתן למחוק איש קשר זה — הוא חתום על השאלות קיימות.",
}

app = FastAPI(
    title="Loan Manager API",
    description="Implementation and item loans for military units, grouped by project.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(APIError)
def handle_postgrest_error(request: Request, exc: APIError) -> JSONResponse:
    """
    Turn a raw Postgres error into something the UI can show.

    23503 is a foreign-key violation — in practice, trying to delete a
    location, type, model, or status that is still referenced elsewhere.
    That is a client mistake (409), not a server fault.
    """
    status = 409 if exc.code == "23503" else 400
    detail = exc.message
    if exc.code == "23503":
        for constraint, friendly in FK_VIOLATION_MESSAGES.items():
            if constraint in (exc.message or ""):
                detail = friendly
                break
    return JSONResponse(
        status_code=status,
        content={"detail": detail, "hint": exc.hint, "code": exc.code},
    )


@app.get("/api/health", tags=["meta"])
def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(projects.router)
app.include_router(locations.router)
app.include_router(contacts.router)
app.include_router(item_types.router)
app.include_router(item_models.router)
app.include_router(item_statuses.router)
app.include_router(items.router)
app.include_router(loans.router)
app.include_router(feedback.router)
