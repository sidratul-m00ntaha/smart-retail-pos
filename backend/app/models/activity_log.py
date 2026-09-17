"""ActivityLogs table: important business actions (PRD 5.21)."""
from datetime import datetime

from sqlalchemy import ForeignKey, Unicode, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ActivityLog(Base):
    __tablename__ = "ActivityLogs"

    activity_log_id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("Users.user_id"), index=True)
    action: Mapped[str] = mapped_column(Unicode(50))
    entity: Mapped[str] = mapped_column(Unicode(50))
    reference: Mapped[str | None] = mapped_column(Unicode(100))
    details: Mapped[str | None] = mapped_column(Unicode(500))
    created_at: Mapped[datetime] = mapped_column(server_default=func.sysutcdatetime(), index=True)