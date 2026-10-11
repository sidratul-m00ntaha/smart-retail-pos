"""DayClosings: the end-of-day cash count (Module 5 extension, not in the original PRD).

One row per store day. It stores what the cash drawer SHOULD hold (worked out from the day's sales, due payments and
refunds) next to what was actually counted, so a shortage or an overage is on record.
"""
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, ForeignKey, Numeric, Unicode, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class DayClosing(Base):
    __tablename__ = "DayClosings"

    day_closing_id: Mapped[int] = mapped_column(primary_key=True)
    business_date: Mapped[date] = mapped_column(Date, unique=True)  # the store-local day that was closed
    opening_cash: Mapped[Decimal] = mapped_column(Numeric(18, 2))  # cash already in the drawer when the day started
    expected_cash: Mapped[Decimal] = mapped_column(Numeric(18, 2))  # opening + cash sales + cash due payments - cash refunds
    counted_cash: Mapped[Decimal] = mapped_column(Numeric(18, 2))  # what the person counted
    difference: Mapped[Decimal] = mapped_column(Numeric(18, 2))  # counted - expected: negative = cash is missing
    note: Mapped[str | None] = mapped_column(Unicode(255), default=None)
    closed_by: Mapped[int] = mapped_column(ForeignKey("Users.user_id"))
    created_at: Mapped[datetime] = mapped_column(server_default=func.sysutcdatetime())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.sysutcdatetime(), onupdate=func.sysutcdatetime())
