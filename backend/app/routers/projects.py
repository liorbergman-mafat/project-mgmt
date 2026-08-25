from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter

from ..repository import first_or_404, payload, require_non_empty, rows, table
from ..schemas import (
    Feedback,
    Item,
    Loan,
    Project,
    ProjectCreate,
    ProjectDetail,
    ProjectStatus,
    ProjectSummary,
    ProjectUpdate,
)
from .items import ITEM_SELECT
from .loans import LOAN_SELECT
from .feedback import FEEDBACK_SELECT

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.get("", response_model=list[ProjectSummary])
def list_projects(status: ProjectStatus | None = None) -> list[ProjectSummary]:
    """
    All projects, each with the counts shown on its card.

    Three queries total rather than one-per-project: we pull the loan and
    feedback keys in bulk and aggregate them here.
    """
    query = table("projects").select("*").order("created_at", desc=True)
    if status:
        query = query.eq("status", status)
    projects = rows(query.execute())

    loans = rows(table("loans").select("project_id, status").execute())
    feedback = rows(table("feedback").select("project_id").execute())

    summaries: list[ProjectSummary] = []

    for project in projects:
        pid = project["id"]
        project_loans = [loan for loan in loans if loan["project_id"] == pid]
        open_loans = [loan for loan in project_loans if loan["status"] == "loaned"]
        summaries.append(
            ProjectSummary(
                **project,
                loan_count=len(project_loans),
                open_loan_count=len(open_loans),
                feedback_count=sum(1 for f in feedback if f["project_id"] == pid),
            )
        )

    return summaries


@router.post("", response_model=Project, status_code=201)
def create_project(body: ProjectCreate) -> Project:
    response = table("projects").insert(payload(body)).execute()
    return Project(**first_or_404(response, "Project was not created"))


@router.get("/{project_id}", response_model=Project)
def get_project(project_id: UUID) -> Project:
    response = table("projects").select("*").eq("id", str(project_id)).execute()
    return Project(**first_or_404(response, "Project not found"))


@router.get("/{project_id}/detail", response_model=ProjectDetail)
def get_project_detail(project_id: UUID) -> ProjectDetail:
    """The project itself, its items, its loans, and their feedback."""
    pid = str(project_id)

    project = first_or_404(
        table("projects").select("*").eq("id", pid).execute(),
        "Project not found",
    )
    items = rows(
        table("items")
        .select(ITEM_SELECT)
        .eq("project_id", pid)
        .order("created_at", desc=True)
        .execute()
    )
    loans = rows(
        table("loans")
        .select(LOAN_SELECT)
        .eq("project_id", pid)
        .order("loaned_at", desc=True)
        .execute()
    )
    feedback = rows(
        table("feedback")
        .select(FEEDBACK_SELECT)
        .eq("project_id", pid)
        .order("feedback_at", desc=True)
        .execute()
    )

    return ProjectDetail(
        project=Project(**project),
        items=[Item(**item) for item in items],
        loans=[Loan(**loan) for loan in loans],
        feedback=[Feedback(**item) for item in feedback],
    )


@router.patch("/{project_id}", response_model=Project)
def update_project(project_id: UUID, body: ProjectUpdate) -> Project:
    data = payload(body, partial=True)
    require_non_empty(data)
    response = table("projects").update(data).eq("id", str(project_id)).execute()
    return Project(**first_or_404(response, "Project not found"))


@router.post("/{project_id}/archive", response_model=Project)
def archive_project(project_id: UUID) -> Project:
    response = (
        table("projects")
        .update({"status": "archived"})
        .eq("id", str(project_id))
        .execute()
    )
    return Project(**first_or_404(response, "Project not found"))


@router.post("/{project_id}/unarchive", response_model=Project)
def unarchive_project(project_id: UUID) -> Project:
    response = (
        table("projects")
        .update({"status": "active"})
        .eq("id", str(project_id))
        .execute()
    )
    return Project(**first_or_404(response, "Project not found"))


@router.delete("/{project_id}", status_code=204, response_model=None)
def delete_project(project_id: UUID) -> None:
    """Deletes the project and, by cascade, its loans and feedback."""
    first_or_404(
        table("projects").select("id").eq("id", str(project_id)).execute(),
        "Project not found",
    )
    table("projects").delete().eq("id", str(project_id)).execute()
