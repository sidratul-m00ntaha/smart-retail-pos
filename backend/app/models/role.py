"""Roles table: Admin, Manager, Cashier."""
from datetime import datetime

from sqlalchemy import Unicode, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.role_permission import role_permissions


class Role(Base):
    __tablename__ = "Roles"

    role_id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(Unicode(50), unique=True)
    description: Mapped[str | None] = mapped_column(Unicode(255))
    created_at: Mapped[datetime] = mapped_column(server_default=func.sysutcdatetime())

    users: Mapped[list["User"]] = relationship(back_populates="role")
    permissions: Mapped[list["Permission"]] = relationship(secondary=role_permissions, back_populates="roles")