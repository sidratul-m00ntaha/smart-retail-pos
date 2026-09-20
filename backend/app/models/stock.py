"""Inventory tables: current stock, movement ledger, manual adjustments, expiry batches."""
from datetime import datetime, date

from sqlalchemy import ForeignKey, Unicode, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ProductStock(Base):
    __tablename__ = "ProductStock"

    product_stock_id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int]  # TODO: ForeignKey("Products.product_id") once Module 3 is merged
    current_stock: Mapped[int] = mapped_column(default=0)
    reserved_stock: Mapped[int] = mapped_column(default=0)
    reorder_level: Mapped[int] = mapped_column(default=0)
    maximum_level: Mapped[int | None]
    updated_at: Mapped[datetime] = mapped_column(server_default=func.sysutcdatetime(), onupdate=func.sysutcdatetime())


class StockMovement(Base):
    __tablename__ = "StockMovements"

    stock_movement_id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int]  # TODO: ForeignKey("Products.product_id")
    movement_type: Mapped[str] = mapped_column(Unicode(10))  # "in" or "out"
    quantity: Mapped[int]
    running_balance: Mapped[int]
    source: Mapped[str] = mapped_column(Unicode(30))  # "purchase", "sale", "adjustment"
    reference_id: Mapped[int | None]
    created_by: Mapped[int | None] = mapped_column(ForeignKey("Users.user_id"))
    created_at: Mapped[datetime] = mapped_column(server_default=func.sysutcdatetime())


class StockAdjustment(Base):
    __tablename__ = "StockAdjustments"

    stock_adjustment_id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int]  # TODO: ForeignKey("Products.product_id")
    quantity_change: Mapped[int]  # positive = increase, negative = decrease
    reason: Mapped[str] = mapped_column(Unicode(255))
    balance_after: Mapped[int]
    adjusted_by: Mapped[int | None] = mapped_column(ForeignKey("Users.user_id"))
    created_at: Mapped[datetime] = mapped_column(server_default=func.sysutcdatetime())


class StockBatch(Base):
    __tablename__ = "StockBatches"

    stock_batch_id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int]  # TODO: ForeignKey("Products.product_id")
    batch_number: Mapped[str] = mapped_column(Unicode(50))
    quantity: Mapped[int]
    expiry_date: Mapped[date]
    received_at: Mapped[datetime] = mapped_column(server_default=func.sysutcdatetime())