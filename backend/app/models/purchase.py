# # from sqlalchemy import Column, Integer, String, DECIMAL, DateTime, ForeignKey
# # from sqlalchemy.orm import relationship
# # from sqlalchemy.sql import func

# # from app.database import Base


# # class Purchase(Base):
# #     __tablename__ = "Purchases"

# #     PurchaseID = Column(Integer, primary_key=True, autoincrement=True)
# #     PurchaseNo = Column(String(20), unique=True, nullable=False, index=True)
# #     SupplierID = Column(Integer, ForeignKey("Suppliers.SupplierID"), nullable=False)
# #     PurchaseDate = Column(DateTime, server_default=func.getdate())
# #     Subtotal = Column(DECIMAL(12, 2), nullable=False, default=0)
# #     Discount = Column(DECIMAL(12, 2), nullable=False, default=0)
# #     VAT = Column(DECIMAL(12, 2), nullable=False, default=0)
# #     Total = Column(DECIMAL(12, 2), nullable=False, default=0)
# #     Paid = Column(DECIMAL(12, 2), nullable=False, default=0)
# #     Due = Column(DECIMAL(12, 2), nullable=False, default=0)
# #     Status = Column(String(20), nullable=False, default="Confirmed")
# #     CreatedByUserID = Column(Integer, nullable=True)  # FK -> Users (Module 1), added once that table exists
# #     CreatedAt = Column(DateTime, server_default=func.getdate())

# #     supplier = relationship("Supplier", back_populates="purchases")
# #     items = relationship("PurchaseItem", back_populates="purchase", cascade="all, delete-orphan")


# # class PurchaseItem(Base):
# #     __tablename__ = "PurchaseItems"

# #     PurchaseItemID = Column(Integer, primary_key=True, autoincrement=True)
# #     PurchaseID = Column(Integer, ForeignKey("Purchases.PurchaseID"), nullable=False)
# #     ProductID = Column(Integer, nullable=False)  # FK -> Products (Module 2), add ForeignKey() once that table merges
# #     Quantity = Column(DECIMAL(10, 2), nullable=False)
# #     UnitPrice = Column(DECIMAL(12, 2), nullable=False)
# #     LineTotal = Column(DECIMAL(12, 2), nullable=False)

# #     purchase = relationship("Purchase", back_populates="items")


# # class SupplierPayment(Base):
# #     __tablename__ = "SupplierPayments"

# #     PaymentID = Column(Integer, primary_key=True, autoincrement=True)
# #     SupplierID = Column(Integer, ForeignKey("Suppliers.SupplierID"), nullable=False)
# #     PurchaseID = Column(Integer, ForeignKey("Purchases.PurchaseID"), nullable=True)
# #     Amount = Column(DECIMAL(12, 2), nullable=False)
# #     Method = Column(String(20), nullable=False, default="Cash")  # "Cash" | "Bank" | "Digital"
# #     PaymentDate = Column(DateTime, server_default=func.getdate())
# #     CreatedByUserID = Column(Integer, nullable=True)

# #     supplier = relationship("Supplier", back_populates="payments")
# #     purchase = relationship("Purchase")  # optional link — a payment can be a general payment, not tied to one purchase


# #----------------------------
# """Module 3 tables: Purchases, PurchaseItems and SupplierPayments (PRD 5.6, 5.7)."""
# from datetime import date, datetime
# from decimal import Decimal

# from sqlalchemy import ForeignKey, Numeric, Unicode, func, text
# from sqlalchemy.orm import Mapped, mapped_column, relationship

# from app.database import Base


# class Purchase(Base):
#     """One confirmed purchase from a supplier. Amounts are saved as calculated, so a purchase never changes later."""

#     __tablename__ = "Purchases"

#     purchase_id: Mapped[int] = mapped_column(primary_key=True)
#     purchase_number: Mapped[str] = mapped_column(Unicode(30), unique=True)  # e.g. PUR-2026-00143
#     supplier_id: Mapped[int] = mapped_column(ForeignKey("Suppliers.supplier_id"), index=True)
#     subtotal: Mapped[Decimal] = mapped_column(Numeric(18, 2))  # sum of the line totals
#     discount_amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), server_default=text("0"))
#     tax_rate_id: Mapped[int | None] = mapped_column(ForeignKey("TaxRates.tax_rate_id"))
#     tax_percent: Mapped[Decimal] = mapped_column(Numeric(5, 2), server_default=text("0"))  # copy of the rate used
#     tax_amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), server_default=text("0"))
#     shipping_charge: Mapped[Decimal] = mapped_column(Numeric(18, 2), server_default=text("0"))
#     total_amount: Mapped[Decimal] = mapped_column(Numeric(18, 2))  # grand total
#     paid_amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), server_default=text("0"))
#     due_amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), server_default=text("0"))  # = total - paid
#     payment_status: Mapped[str] = mapped_column(Unicode(20))  # PAID / PARTIALLY_PAID / DUE
#     status: Mapped[str] = mapped_column(Unicode(20), server_default=text("'confirmed'"))
#     note: Mapped[str | None] = mapped_column(Unicode(255))
#     created_by: Mapped[int | None] = mapped_column(ForeignKey("Users.user_id"))
#     created_at: Mapped[datetime] = mapped_column(server_default=func.sysutcdatetime(), index=True)

#     supplier: Mapped["Supplier"] = relationship(back_populates="purchases")
#     items: Mapped[list["PurchaseItem"]] = relationship(back_populates="purchase")
#     payments: Mapped[list["SupplierPayment"]] = relationship(back_populates="purchase")


# class PurchaseItem(Base):
#     __tablename__ = "PurchaseItems"

#     purchase_item_id: Mapped[int] = mapped_column(primary_key=True)
#     purchase_id: Mapped[int] = mapped_column(ForeignKey("Purchases.purchase_id"), index=True)
#     product_id: Mapped[int] = mapped_column(ForeignKey("Products.product_id"), index=True)
#     product_name: Mapped[str] = mapped_column(Unicode(150))  # copy of the name at purchase time
#     quantity: Mapped[Decimal] = mapped_column(Numeric(18, 3))
#     unit_price: Mapped[Decimal] = mapped_column(Numeric(18, 2))
#     line_discount_percent: Mapped[Decimal] = mapped_column(Numeric(5, 2), server_default=text("0"))
#     line_total: Mapped[Decimal] = mapped_column(Numeric(18, 2))  # quantity x unit_price x (1 - discount %)
#     # Only for products with expiry tracking: which batch this line brought in
#     batch_number: Mapped[str | None] = mapped_column(Unicode(50))
#     expiry_date: Mapped[date | None]
#     created_at: Mapped[datetime] = mapped_column(server_default=func.sysutcdatetime())

#     purchase: Mapped["Purchase"] = relationship(back_populates="items")


# class SupplierPayment(Base):
#     """Money paid to a supplier: at the time of the purchase, or later to reduce the supplier's due (PRD 5.7)."""

#     __tablename__ = "SupplierPayments"

#     supplier_payment_id: Mapped[int] = mapped_column(primary_key=True)
#     supplier_id: Mapped[int] = mapped_column(ForeignKey("Suppliers.supplier_id"), index=True)
#     # Set when the payment belongs to one purchase; empty when it was spread over the oldest open purchases
#     purchase_id: Mapped[int | None] = mapped_column(ForeignKey("Purchases.purchase_id"), index=True)
#     amount: Mapped[Decimal] = mapped_column(Numeric(18, 2))
#     method: Mapped[str] = mapped_column(Unicode(20))  # cash / bank / digital
#     note: Mapped[str | None] = mapped_column(Unicode(255))
#     created_by: Mapped[int | None] = mapped_column(ForeignKey("Users.user_id"))
#     created_at: Mapped[datetime] = mapped_column(server_default=func.sysutcdatetime(), index=True)

#     supplier: Mapped["Supplier"] = relationship(back_populates="payments")
#     purchase: Mapped["Purchase | None"] = relationship(back_populates="payments")












"""Module 3 tables: Purchases, PurchaseItems and SupplierPayments (PRD 5.6, 5.7)."""
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import ForeignKey, Numeric, Unicode, func, text
from sqlalchemy.orm import Mapped, mapped_column, relationship, synonym

from app.database import Base


class Purchase(Base):
    """One confirmed purchase from a supplier. Amounts are saved as calculated, so a purchase never changes later."""

    __tablename__ = "Purchases"

    purchase_id: Mapped[int] = mapped_column(primary_key=True)
    purchase_number: Mapped[str] = mapped_column(Unicode(30), unique=True)  # e.g. PUR-2026-00143
    supplier_id: Mapped[int] = mapped_column(ForeignKey("Suppliers.supplier_id"), index=True)
    subtotal: Mapped[Decimal] = mapped_column(Numeric(18, 2))  # sum of the line totals
    discount_amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), server_default=text("0"))
    tax_rate_id: Mapped[int | None] = mapped_column(ForeignKey("TaxRates.tax_rate_id"))
    tax_percent: Mapped[Decimal] = mapped_column(Numeric(5, 2), server_default=text("0"))  # copy of the rate used
    tax_amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), server_default=text("0"))
    shipping_charge: Mapped[Decimal] = mapped_column(Numeric(18, 2), server_default=text("0"))
    total_amount: Mapped[Decimal] = mapped_column(Numeric(18, 2))  # grand total
    paid_amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), server_default=text("0"))
    due_amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), server_default=text("0"))  # = total - paid
    payment_status: Mapped[str] = mapped_column(Unicode(20))  # PAID / PARTIALLY_PAID / DUE
    status: Mapped[str] = mapped_column(Unicode(20), server_default=text("'confirmed'"))
    note: Mapped[str | None] = mapped_column(Unicode(255))
    created_by: Mapped[int | None] = mapped_column(ForeignKey("Users.user_id"))
    created_at: Mapped[datetime] = mapped_column(server_default=func.sysutcdatetime(), index=True)

    supplier: Mapped["Supplier"] = relationship(back_populates="purchases")
    items: Mapped[list["PurchaseItem"]] = relationship(back_populates="purchase")
    payments: Mapped[list["SupplierPayment"]] = relationship(back_populates="purchase")

    # Old attribute names, kept for Module 1's AI Assistant (services/ai/report_functions.py). See models/supplier.py.
    PurchaseID = synonym("purchase_id")
    SupplierID = synonym("supplier_id")
    PurchaseDate = synonym("created_at")
    Total = synonym("total_amount")
    Paid = synonym("paid_amount")
    Due = synonym("due_amount")


class PurchaseItem(Base):
    __tablename__ = "PurchaseItems"

    purchase_item_id: Mapped[int] = mapped_column(primary_key=True)
    purchase_id: Mapped[int] = mapped_column(ForeignKey("Purchases.purchase_id"), index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("Products.product_id"), index=True)
    product_name: Mapped[str] = mapped_column(Unicode(150))  # copy of the name at purchase time
    quantity: Mapped[Decimal] = mapped_column(Numeric(18, 3))
    unit_price: Mapped[Decimal] = mapped_column(Numeric(18, 2))
    line_discount_percent: Mapped[Decimal] = mapped_column(Numeric(5, 2), server_default=text("0"))
    line_total: Mapped[Decimal] = mapped_column(Numeric(18, 2))  # quantity x unit_price x (1 - discount %)
    # Only for products with expiry tracking: which batch this line brought in
    batch_number: Mapped[str | None] = mapped_column(Unicode(50))
    expiry_date: Mapped[date | None]
    created_at: Mapped[datetime] = mapped_column(server_default=func.sysutcdatetime())

    purchase: Mapped["Purchase"] = relationship(back_populates="items")


class SupplierPayment(Base):
    """Money paid to a supplier: at the time of the purchase, or later to reduce the supplier's due (PRD 5.7)."""

    __tablename__ = "SupplierPayments"

    supplier_payment_id: Mapped[int] = mapped_column(primary_key=True)
    supplier_id: Mapped[int] = mapped_column(ForeignKey("Suppliers.supplier_id"), index=True)
    # Set when the payment belongs to one purchase; empty when it was spread over the oldest open purchases
    purchase_id: Mapped[int | None] = mapped_column(ForeignKey("Purchases.purchase_id"), index=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(18, 2))
    method: Mapped[str] = mapped_column(Unicode(20))  # cash / bank / digital
    note: Mapped[str | None] = mapped_column(Unicode(255))
    created_by: Mapped[int | None] = mapped_column(ForeignKey("Users.user_id"))
    created_at: Mapped[datetime] = mapped_column(server_default=func.sysutcdatetime(), index=True)

    supplier: Mapped["Supplier"] = relationship(back_populates="payments")
    purchase: Mapped["Purchase | None"] = relationship(back_populates="payments")
