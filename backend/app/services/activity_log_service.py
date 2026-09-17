"""The ActivityLogs table (PRD 5.21): every module writes to it, admins read it."""
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import ColumnElement, func, or_, select
from sqlalchemy.orm import Session

from app.models import ActivityLog, User
from app.schemas.activity_log import ActivityLogFilterOptions, ActivityLogOut, ActivityLogPage, ActivityLogUser


def log_activity(
    db: Session,
    user_id: int | None,
    action: str,
    entity: str,
    reference: str | None = None,
    details: str | None = None,
) -> None:
    """Adds an activity log row. Does NOT commit - the caller commits it together with its own changes."""
    db.add(ActivityLog(user_id=user_id, action=action, entity=entity, reference=reference, details=details))


def list_activity_logs(
    db: Session,
    *,
    user_id: int | None = None,
    action: str | None = None,
    entity: str | None = None,
    search: str | None = None,
    created_from: datetime | None = None,
    created_before: datetime | None = None,
    page: int = 1,
    page_size: int = 25,
) -> ActivityLogPage:
    """One page of log rows matching the filters, newest first."""
    if created_from and created_before and _as_utc(created_from) >= _as_utc(created_before):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="The start date must be before the end date.")

    conditions: list[ColumnElement[bool]] = []
    if user_id is not None:
        conditions.append(ActivityLog.user_id == user_id)
    if action:
        conditions.append(ActivityLog.action == action)
    if entity:
        conditions.append(ActivityLog.entity == entity)
    if search and search.strip():
        term = search.strip()
        # autoescape: a % or _ typed by the user is searched for as it is
        conditions.append(
            or_(ActivityLog.reference.contains(term, autoescape=True), ActivityLog.details.contains(term, autoescape=True))
        )
    if created_from:
        conditions.append(ActivityLog.created_at >= _as_utc(created_from))
    if created_before:
        conditions.append(ActivityLog.created_at < _as_utc(created_before))

    total = db.scalar(select(func.count()).select_from(ActivityLog).where(*conditions)) or 0
    rows = db.execute(
        select(ActivityLog, User.full_name, User.username)
        .outerjoin(User, ActivityLog.user_id == User.user_id)
        .where(*conditions)
        .order_by(ActivityLog.created_at.desc(), ActivityLog.activity_log_id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    items = [
        ActivityLogOut(
            activity_log_id=log.activity_log_id,
            user_id=log.user_id,
            user_full_name=full_name,
            username=username,
            action=log.action,
            entity=log.entity,
            reference=log.reference,
            details=log.details,
            created_at=log.created_at,
        )
        for log, full_name, username in rows
    ]
    return ActivityLogPage(items=items, total=total, page=page, page_size=page_size)


def get_filter_options(db: Session) -> ActivityLogFilterOptions:
    """The users, actions and entities that appear in the log, for the filter dropdowns."""
    users = db.scalars(
        select(User).where(User.user_id.in_(select(ActivityLog.user_id).distinct())).order_by(User.full_name)
    )
    return ActivityLogFilterOptions(
        users=[ActivityLogUser(user_id=user.user_id, full_name=user.full_name, username=user.username) for user in users],
        actions=list(db.scalars(select(ActivityLog.action).distinct().order_by(ActivityLog.action))),
        entities=list(db.scalars(select(ActivityLog.entity).distinct().order_by(ActivityLog.entity))),
    )


def _as_utc(value: datetime) -> datetime:
    """The database stores UTC without a time zone, so times sent with a zone are converted first."""
    if value.tzinfo is None:
        return value  # already UTC
    return value.astimezone(timezone.utc).replace(tzinfo=None)
