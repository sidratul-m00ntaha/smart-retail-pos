"""Users table: staff accounts that can log in."""
from datetime import datetime

from sqlalchemy import ForeignKey, Unicode, func, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    __tablename__ = "Users"

    user_id: Mapped[int] = mapped_column(primary_key=True)
    full_name: Mapped[str] = mapped_column(Unicode(100))
    username: Mapped[str] = mapped_column(Unicode(50), unique=True)
    email: Mapped[str] = mapped_column(Unicode(255), unique=True)
    password_hash: Mapped[str] = mapped_column(Unicode(255))
    role_id: Mapped[int] = mapped_column(ForeignKey("Roles.role_id"))
    is_active: Mapped[bool] = mapped_column(server_default=text("1"))
    last_login_at: Mapped[datetime | None]
    created_at: Mapped[datetime] = mapped_column(server_default=func.sysutcdatetime())
    updated_at: Mapped[datetime | None] = mapped_column(onupdate=func.sysutcdatetime())

    role: Mapped["Role"] = relationship(back_populates="users")