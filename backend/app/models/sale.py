"""Module 5 tables: Sales, SaleItems, Payments, Invoices, plus HeldCarts for pausing a bill."""
from datetime import datetime
from decimal import Decimal

from sqlalchemy import ForeignKey, Numeric, Unicode, func, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Sale(Base):
    __tablename__ = "Sales"

    sale_id: Mapped[int] = mapped_column(primary_key=True)
    customer_id: Mapped[int | None] = mapped_column(ForeignKey("Customers.customer_id"), default=None, index=True)  # NULL = guest
    cashier_id: Mapped[int] = mapped_column(ForeignKey("Users.user_id"))
    subtotal: Mapped[Decimal] = mapped_column(Numeric(18, 2))
    discount_percent: Mapped[Decimal] = mapped_column(Numeric(5, 2), server_default=text("0"))  # loyalty % used for this sale
    discount_amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), server_default=text("0"))
    tax_amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), server_default=text("0"))
    total_amount: Mapped[Decimal] = mapped_column(Numeric(18, 2))
    paid_amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), server_default=text("0"))
    due_amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), server_default=text("0"))
    payment_status: Mapped[str] = mapped_column(Unicode(20))  # PAID / PARTIALLY_PAID / DUE
    status: Mapped[str] = mapped_column(Unicode(20), server_default=text("'completed'"))  # completed / partially_returned / returned
    created_at: Mapped[datetime] = mapped_column(server_default=func.sysutcdatetime(), index=True)

    items: Mapped[list["SaleItem"]] = relationship(back_populates="sale")
    payments: Mapped[list["Payment"]] = relationship(back_populates="sale")
    invoice: Mapped["Invoice | None"] = relationship(back_populates="sale", uselist=False)


class SaleItem(Base):
    __tablename__ = "SaleItems"

    sale_item_id: Mapped[int] = mapped_column(primary_key=True)
    sale_id: Mapped[int] = mapped_column(ForeignKey("Sales.sale_id"), index=True)
    # Plain INT for now: add ForeignKey("Products.product_id") once Module 2's Products model is merged.
    product_id: Mapped[int] = mapped_column(index=True)
    product_name: Mapped[str] = mapped_column(Unicode(150))  # copy of the name at sale time, so invoices never change
    quantity: Mapped[Decimal] = mapped_column(Numeric(18, 3))
    unit_price: Mapped[Decimal] = mapped_column(Numeric(18, 2))
    line_subtotal: Mapped[Decimal] = mapped_column(Numeric(18, 2))  # unit_price x quantity
    discount_amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), server_default=text("0"))
    tax_percent: Mapped[Decimal] = mapped_column(Numeric(5, 2), server_default=text("0"))
    tax_amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), server_default=text("0"))
    line_total: Mapped[Decimal] = mapped_column(Numeric(18, 2))  # line_subtotal - discount + tax
    created_at: Mapped[datetime] = mapped_column(server_default=func.sysutcdatetime())

    sale: Mapped["Sale"] = relationship(back_populates="items")


class Payment(Base):
    """Money actually received for a sale. A due amount is NOT a payment row; it lives on Sales.due_amount."""

    __tablename__ = "Payments"

    payment_id: Mapped[int] = mapped_column(primary_key=True)
    sale_id: Mapped[int] = mapped_column(ForeignKey("Sales.sale_id"), index=True)
    method: Mapped[str] = mapped_column(Unicode(20))  # cash / card / digital
    amount: Mapped[Decimal] = mapped_column(Numeric(18, 2))
    created_at: Mapped[datetime] = mapped_column(server_default=func.sysutcdatetime())

    sale: Mapped["Sale"] = relationship(back_populates="payments")


class Invoice(Base):
    __tablename__ = "Invoices"

    invoice_id: Mapped[int] = mapped_column(primary_key=True)
    sale_id: Mapped[int] = mapped_column(ForeignKey("Sales.sale_id"), unique=True)  # exactly one invoice per sale
    invoice_number: Mapped[str] = mapped_column(Unicode(30), unique=True)  # e.g. INV-2026-00125
    created_at: Mapped[datetime] = mapped_column(server_default=func.sysutcdatetime())

    sale: Mapped["Sale"] = relationship(back_populates="invoice")


class HeldCart(Base):
    """A paused bill (saved cart). It is not a sale: no stock, points, due or invoice are touched."""

    __tablename__ = "HeldCarts"

    held_cart_id: Mapped[int] = mapped_column(primary_key=True)
    cashier_id: Mapped[int] = mapped_column(ForeignKey("Users.user_id"))
    customer_id: Mapped[int | None] = mapped_column(ForeignKey("Customers.customer_id"), default=None)
    note: Mapped[str | None] = mapped_column(Unicode(100), default=None)  # e.g. "red jacket, lane 2"
    status: Mapped[str] = mapped_column(Unicode(20), server_default=text("'held'"))  # held / completed / discarded
    created_at: Mapped[datetime] = mapped_column(server_default=func.sysutcdatetime())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.sysutcdatetime(), onupdate=func.sysutcdatetime())

    items: Mapped[list["HeldCartItem"]] = relationship(back_populates="held_cart")


class HeldCartItem(Base):
    """Only product and quantity are saved. Prices, VAT, discount and stock are re-checked when the cart is resumed."""

    __tablename__ = "HeldCartItems"

    held_cart_item_id: Mapped[int] = mapped_column(primary_key=True)
    held_cart_id: Mapped[int] = mapped_column(ForeignKey("HeldCarts.held_cart_id"), index=True)
    product_id: Mapped[int] = mapped_column()  # plain INT until the Products model is merged, like SaleItems
    quantity: Mapped[Decimal] = mapped_column(Numeric(18, 3))
    created_at: Mapped[datetime] = mapped_column(server_default=func.sysutcdatetime())

    held_cart: Mapped["HeldCart"] = relationship(back_populates="items")
