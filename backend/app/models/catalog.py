"""Categories, Brands, Units and TaxRates tables (PRD 5.4, 5.16)."""
from datetime import datetime
from decimal import Decimal

from sqlalchemy import Numeric, Unicode, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Category(Base):
    __tablename__ = "Categories"

    category_id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(Unicode(100), unique=True)
    status: Mapped[str] = mapped_column(Unicode(10), server_default="active")  # active | inactive
    created_at: Mapped[datetime] = mapped_column(server_default=func.sysutcdatetime())

    products: Mapped[list["Product"]] = relationship(back_populates="category")


class Brand(Base):
    __tablename__ = "Brands"

    brand_id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(Unicode(100), unique=True)
    status: Mapped[str] = mapped_column(Unicode(10), server_default="active")
    created_at: Mapped[datetime] = mapped_column(server_default=func.sysutcdatetime())

    products: Mapped[list["Product"]] = relationship(back_populates="brand")


class Unit(Base):
    __tablename__ = "Units"

    unit_id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(Unicode(50), unique=True)  # Piece, Kg, Liter, Box, Packet
    status: Mapped[str] = mapped_column(Unicode(10), server_default="active")
    created_at: Mapped[datetime] = mapped_column(server_default=func.sysutcdatetime())

    products: Mapped[list["Product"]] = relationship(back_populates="unit")


class TaxRate(Base):
    """PRD 5.16 - named, reusable VAT rates (e.g. Standard VAT 15%). Becomes the target of
    StoreSettings.default_tax_rate_id once Module 1 wires up that foreign key."""
    __tablename__ = "TaxRates"

    tax_rate_id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(Unicode(100))  # "Standard VAT", "Reduced VAT", "Zero VAT"
    rate_percent: Mapped[Decimal] = mapped_column(Numeric(5, 2))
    status: Mapped[str] = mapped_column(Unicode(10), server_default="active")
    created_at: Mapped[datetime] = mapped_column(server_default=func.sysutcdatetime())

    products: Mapped[list["Product"]] = relationship(back_populates="tax_rate")
