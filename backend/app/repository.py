"""Thin helpers over the Supabase client, so routers stay readable."""

from __future__ import annotations

from typing import Any

from fastapi import HTTPException
from pydantic import BaseModel

from .db import get_client


def table(name: str):
    return get_client().table(name)


def payload(model: BaseModel, *, partial: bool = False) -> dict[str, Any]:
    """
    Turn a pydantic model into something PostgREST accepts.

    mode="json" is the important part: it converts UUID and datetime into
    strings, which the underlying HTTP client cannot serialize on its own.
    """
    data = model.model_dump(mode="json", exclude_unset=partial, exclude_none=partial)
    return data


def rows(response) -> list[dict[str, Any]]:
    return response.data or []


def first_or_404(response, detail: str = "Not found") -> dict[str, Any]:
    data = rows(response)
    if not data:
        raise HTTPException(status_code=404, detail=detail)
    return data[0]


def require_non_empty(data: dict[str, Any], detail: str = "No fields to update") -> None:
    if not data:
        raise HTTPException(status_code=400, detail=detail)
