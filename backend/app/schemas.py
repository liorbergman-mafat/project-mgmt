from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel

ProjectStatus = Literal["active", "completed", "archived"]
LoanStatus = Literal["loaned", "returned", "lost"]


# --------------------------------------------------------------------------
# Projects
# --------------------------------------------------------------------------
class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    status: ProjectStatus = "active"


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[ProjectStatus] = None


class Project(ProjectCreate):
    id: UUID
    created_at: datetime
    updated_at: datetime


class ProjectSummary(Project):
    """A project plus the counts the projects list shows on each card."""

    loan_count: int = 0
    open_loan_count: int = 0
    feedback_count: int = 0


# --------------------------------------------------------------------------
# Item lookup lists — Type / Model / Status. Managed from the Settings page.
# --------------------------------------------------------------------------
class ItemTypeCreate(BaseModel):
    name: str


class ItemTypeUpdate(BaseModel):
    name: Optional[str] = None


class ItemType(ItemTypeCreate):
    id: UUID
    created_at: datetime


class ItemModelCreate(BaseModel):
    type_id: UUID
    name: str


class ItemModelUpdate(BaseModel):
    type_id: Optional[UUID] = None
    name: Optional[str] = None


class ItemModel(ItemModelCreate):
    id: UUID
    created_at: datetime


class ItemStatusCreate(BaseModel):
    name: str


class ItemStatusUpdate(BaseModel):
    name: Optional[str] = None


class ItemStatus(ItemStatusCreate):
    id: UUID
    created_at: datetime


# --------------------------------------------------------------------------
# Locations — everywhere an item or loan can point to: a borrowing unit,
# a warehouse, or anywhere else. Managed from the Settings page.
# --------------------------------------------------------------------------
class LocationCreate(BaseModel):
    name: str
    kind: Optional[str] = None
    category: Optional[str] = None
    brigade: Optional[str] = None
    battalion: Optional[str] = None
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None
    notes: Optional[str] = None


class LocationUpdate(BaseModel):
    name: Optional[str] = None
    kind: Optional[str] = None
    category: Optional[str] = None
    brigade: Optional[str] = None
    battalion: Optional[str] = None
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None
    notes: Optional[str] = None


class Location(LocationCreate):
    id: UUID
    created_at: datetime


# --------------------------------------------------------------------------
# Items — one row per physical item, owned by exactly one project.
# --------------------------------------------------------------------------
class ItemCreate(BaseModel):
    project_id: UUID
    type_id: UUID
    model_id: UUID
    serial_id: Optional[str] = None
    status_id: UUID
    location_id: UUID


class ItemUpdate(BaseModel):
    type_id: Optional[UUID] = None
    model_id: Optional[UUID] = None
    serial_id: Optional[str] = None
    status_id: Optional[UUID] = None
    location_id: Optional[UUID] = None


class Item(BaseModel):
    id: UUID
    project_id: UUID
    type_id: UUID
    model_id: UUID
    serial_id: Optional[str] = None
    status_id: UUID
    location_id: UUID
    created_at: datetime
    updated_at: datetime

    # Populated by PostgREST's embedded select.
    type: Optional[ItemType] = None
    model: Optional[ItemModel] = None
    status: Optional[ItemStatus] = None
    location: Optional[Location] = None


# --------------------------------------------------------------------------
# Loans
# --------------------------------------------------------------------------
class LoanCreate(BaseModel):
    project_id: UUID
    item_id: UUID
    location_id: UUID
    quantity: int = 1
    status: LoanStatus = "loaned"
    loaned_at: Optional[datetime] = None
    returned_at: Optional[datetime] = None
    notes: Optional[str] = None


class LoanUpdate(BaseModel):
    item_id: Optional[UUID] = None
    location_id: Optional[UUID] = None
    quantity: Optional[int] = None
    status: Optional[LoanStatus] = None
    loaned_at: Optional[datetime] = None
    returned_at: Optional[datetime] = None
    notes: Optional[str] = None


class Loan(BaseModel):
    id: UUID
    project_id: UUID
    item_id: UUID
    location_id: UUID
    quantity: int
    status: LoanStatus
    loaned_at: datetime
    returned_at: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    # Populated by PostgREST's embedded select.
    item: Optional[Item] = None
    location: Optional[Location] = None


# --------------------------------------------------------------------------
# Feedback
# --------------------------------------------------------------------------
class FeedbackCreate(BaseModel):
    project_id: UUID
    location_id: UUID
    loan_id: Optional[UUID] = None
    rating: Optional[int] = None
    content: str
    feedback_at: Optional[datetime] = None


class FeedbackUpdate(BaseModel):
    location_id: Optional[UUID] = None
    loan_id: Optional[UUID] = None
    rating: Optional[int] = None
    content: Optional[str] = None
    feedback_at: Optional[datetime] = None


class Feedback(BaseModel):
    id: UUID
    project_id: UUID
    loan_id: Optional[UUID] = None
    location_id: UUID
    rating: Optional[int] = None
    content: str
    feedback_at: datetime
    created_at: datetime

    location: Optional[Location] = None
    loan: Optional[Loan] = None


# --------------------------------------------------------------------------
# Composite responses
# --------------------------------------------------------------------------
class ProjectDetail(BaseModel):
    """Everything the project page needs, in one round trip."""

    project: Project
    items: list[Item]
    loans: list[Loan]
    feedback: list[Feedback]
