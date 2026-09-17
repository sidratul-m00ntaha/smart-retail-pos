"""Shapes of the activity log API's responses."""
from pydantic import BaseModel

from app.schemas.common import UtcDateTime


class ActivityLogOut(BaseModel):
    activity_log_id: int
    user_id: int | None
    # Empty for actions done by the system
    user_full_name: str | None
    username: str | None
    action: str
    entity: str
    reference: str | None
    details: str | None
    created_at: UtcDateTime


class ActivityLogPage(BaseModel):
    """One page of results, plus the total, so the page can show "1–25 of 132"."""

    items: list[ActivityLogOut]
    total: int
    page: int
    page_size: int


class ActivityLogUser(BaseModel):
    user_id: int
    full_name: str
    username: str


class ActivityLogFilterOptions(BaseModel):
    """Values for the filter dropdowns: only what actually appears in the log."""

    users: list[ActivityLogUser]
    actions: list[str]
    entities: list[str]
