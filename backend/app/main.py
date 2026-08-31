import logging

from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from postgrest.exceptions import APIError

from .activity import ActivityMiddleware
from .config import get_settings
from .deps import current_user, require_admin
from .routers import (
    activity,
    contacts,
    feedback,
    item_models,
    item_statuses,
    item_types,
    items,
    loans,
    locations,
    projects,
    users,
)

settings = get_settings()
logger = logging.getLogger(__name__)

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

# The same idea for unique constraints ("<table>_<column>_key"), which surface
# when a name that has to be one of a kind is used twice.
UNIQUE_VIOLATION_MESSAGES: dict[str, str] = {
    "users_username_key": "שם המשתמש כבר תפוס.",
    "item_types_name_key": "קיימת כבר קטגוריה בשם זה.",
    "item_models_type_id_name_key": "קיים כבר דגם בשם זה תחת הקטגוריה הזו.",
}

# Shown to the browser when a database error has no friendly explanation.
# The real message goes to the server log instead: PostgREST names columns,
# constraints and types, which is a free map of the schema.
GENERIC_ERROR = "הפעולה נכשלה. נסו שוב או פנו למנהל המערכת."

app = FastAPI(
    title="Loan Manager API",
    description="Implementation and item loans for military units, grouped by project.",
    version="0.1.0",
    # No interactive docs in production: the schema is a complete map of the
    # API and /docs is a working client for firing it. DEBUG=true brings them
    # back for local work.
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
    openapi_url="/openapi.json" if settings.debug else None,
)

# Records every change made through the API. Added first so it sits *inside*
# CORS, i.e. it never sees a preflight request.
app.add_middleware(ActivityMiddleware)

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
    23505 is a unique violation — a name already taken. Both are client
    mistakes (409), not server faults. Everything else is logged server-side
    and answered with a generic message.
    """
    conflicts = {"23503": FK_VIOLATION_MESSAGES, "23505": UNIQUE_VIOLATION_MESSAGES}
    for constraint, friendly in conflicts.get(exc.code, {}).items():
        if constraint in (exc.message or ""):
            return JSONResponse(status_code=409, content={"detail": friendly})

    # Anything without friendly text is our bug, not the caller's mistake.
    logger.warning("postgrest %s on %s: %s", exc.code, request.url.path, exc.message)
    return JSONResponse(status_code=400, content={"detail": GENERIC_ERROR})


@app.get("/api/health", tags=["meta"])
def health() -> dict[str, str]:
    return {"status": "ok"}


# Nothing here is public. `signed_in` is the floor; the user routes carry
# their own per-endpoint admin checks (the password route has a self-or-admin
# rule, so it cannot simply be admin-only at the mount).
signed_in = [Depends(current_user)]
admin_only = [Depends(require_admin)]

app.include_router(projects.router, dependencies=signed_in)
app.include_router(locations.router, dependencies=signed_in)
app.include_router(contacts.router, dependencies=signed_in)
app.include_router(item_types.router, dependencies=signed_in)
app.include_router(item_models.router, dependencies=signed_in)
app.include_router(item_statuses.router, dependencies=signed_in)
app.include_router(items.router, dependencies=signed_in)
app.include_router(loans.router, dependencies=signed_in)
app.include_router(feedback.router, dependencies=signed_in)
app.include_router(users.router, dependencies=signed_in)
app.include_router(activity.router, dependencies=admin_only)
# Sign-in is the one door that has to open from outside.
app.include_router(users.auth_router)
