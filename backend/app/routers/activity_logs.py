"""Activity log endpoints: /api/activity-logs (PRD 5.21). Admins only."""
from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import require_permission
from app.database import get_db
from app.models import User
from app.schemas.activity_log import ActivityLogFilterOptions, ActivityLogPage
from app.services import activity_log_service

router = APIRouter(prefix="/api/activity-logs", tags=["Activity Logs"])


@router.get("", response_model=ActivityLogPage)
def list_activity_logs(
    user_id: int | None = None,
    action: str | None = Query(None, max_length=50, description="e.g. LOGIN, CREATE, UPDATE"),
    entity: str | None = Query(None, max_length=50, description="e.g. User, Product, Sale"),
    search: str | None = Query(None, max_length=100, description="Text in the reference or details"),
    created_from: datetime | None = Query(None, description="From this time (included), e.g. 2026-09-17T00:00:00+06:00"),
    created_before: datetime | None = Query(None, description="Before this time (not included)"),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("activity_logs.view")),
):
    """Log rows matching the filters, newest first, one page at a time."""
    return activity_log_service.list_activity_logs(
        db,
        user_id=user_id,
        action=action,
        entity=entity,
        search=search,
        created_from=created_from,
        created_before=created_before,
        page=page,
        page_size=page_size,
    )


@router.get("/filters", response_model=ActivityLogFilterOptions)
def get_filter_options(db: Session = Depends(get_db), current_user: User = Depends(require_permission("activity_logs.view"))):
    """The users, actions and entities that appear in the log, for the filter dropdowns."""
    return activity_log_service.get_filter_options(db)
