"""SaleReturns / SaleReturnItems: cancelling an item after the invoice (not part of the original PRD; the team
added it as an extension - see docs/database/module-5-sales.md).

The original Sale, SaleItems, Payments and Invoice are never edited: PRD 5.17 gives one invoice per sale, and
an invoice is a financial record. A return is a separate credit note against the sale, the same way a customer
due repayment is a separate CustomerPayments row rather than an edit to the Sale.
"""
from datetime import datetime
from decimal import Decimal

from sqlalchemy import ForeignKey, Numeric, Unicode, func, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class SaleReturn(Base):
    __tablename__ = "SaleReturns"

    sale_return_id: Mapped[int] = mapped_column(primary_key=True)
    sale_id: Mapped[int] = mapped_column(ForeignKey("Sales.sale_id"), index=True)
    reason: Mapped[str] = mapped_column(Unicode(255))
    refund_amount: Mapped[Decimal] = mapped_column(Numeric(18, 2))  # total value of the returned lines
    # How much of refund_amount was handed back this way. None when it was fully absorbed by reducing the due.
    refund_method: Mapped[str | None] = mapped_column(Unicode(20), default=None)  # cash / card / digital
    due_reduced: Mapped[Decimal] = mapped_column(Numeric(18, 2), server_default=text("0"))  # the rest: taken off the customer's due
    processed_by: Mapped[int] = mapped_column(ForeignKey("Users.user_id"))
    created_at: Mapped[datetime] = mapped_column(server_default=func.sysutcdatetime())

    items: Mapped[list["SaleReturnItem"]] = relationship(back_populates="sale_return")


class SaleReturnItem(Base):
    __tablename__ = "SaleReturnItems"

    sale_return_item_id: Mapped[int] = mapped_column(primary_key=True)
    sale_return_id: Mapped[int] = mapped_column(ForeignKey("SaleReturns.sale_return_id"), index=True)
    sale_item_id: Mapped[int] = mapped_column(ForeignKey("SaleItems.sale_item_id"), index=True)
    quantity: Mapped[Decimal] = mapped_column(Numeric(18, 3))
    amount: Mapped[Decimal] = mapped_column(Numeric(18, 2))  # this line's share of the refund, prorated from line_total
    restocked: Mapped[bool] = mapped_column(server_default=text("1"))  # false for damaged/expired goods

    sale_return: Mapped["SaleReturn"] = relationship(back_populates="items")
