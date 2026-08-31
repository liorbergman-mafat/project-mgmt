"""
Vercel entry point for the FastAPI backend.

Vercel turns every file under `api/` into a serverless function. This one
exposes the ASGI app from `backend/app/main.py` unchanged, so local development
(`uvicorn app.main:app` from `backend/`) and production run the exact same code.

`vercel.json` rewrites every `/api/*` request here. Vercel hands the function
the *original* request path, so the routers keep their `/api/...` prefixes and
nothing needs to know it is running serverless.
"""

import sys
from pathlib import Path

# `backend/` is not an installed package — put it on the path so `app.main`
# resolves the same way it does when uvicorn runs from inside that directory.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from app.main import app  # noqa: E402  (import must follow the sys.path setup)

# Vercel's Python runtime looks for a module-level ASGI app named `app`.
__all__ = ["app"]
