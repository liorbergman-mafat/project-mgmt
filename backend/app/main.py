from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from postgrest.exceptions import APIError

from .config import get_settings
from .routers import (
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
    return JSONResponse(
        status_code=status,
        content={"detail": exc.message, "hint": exc.hint, "code": exc.code},
    )


@app.get("/api/health", tags=["meta"])
def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(projects.router)
app.include_router(locations.router)
app.include_router(item_types.router)
app.include_router(item_models.router)
app.include_router(item_statuses.router)
app.include_router(items.router)
app.include_router(loans.router)
app.include_router(feedback.router)
