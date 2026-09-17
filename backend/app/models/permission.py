"""Permissions table: one row per protected action, e.g. products.manage."""
from datetime import datetime

from sqlalchemy import Unicode, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.role_permission import role_permissions


class Permission(Base):
    __tablename__ = "Permissions"

    permission_id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(Unicode(100), unique=True)
    description: Mapped[str | None] = mapped_column(Unicode(255))
    created_at: Mapped[datetime] = mapped_column(server_default=func.sysutcdatetime())

    roles: Mapped[list["Role"]] = relationship(secondary=role_permissions, back_populates="permissions")