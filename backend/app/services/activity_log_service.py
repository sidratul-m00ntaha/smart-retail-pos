"""Writes rows to the ActivityLogs table (PRD 5.21). Every module can use it."""
from sqlalchemy.orm import Session

from app.models import ActivityLog


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
