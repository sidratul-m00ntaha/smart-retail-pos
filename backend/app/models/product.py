"""Products table (PRD 5.3).

`current_quantity` mirrors the ER diagram's denormalized stock counter on
Products, so Module 2's product list/dashboard can read stock without joining
Module 4's stock tables. Module 4 owns WRITING to it (stock in/out/adjust);
Module 2 only reads it.
"""
from datetime import datetime
from decimal import Decimal

from sqlalchemy import ForeignKey, Numeric, Unicode, func, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Product(Base):
    __tablename__ = "Products"

    product_id: Mapped[int] = mapped_column(primary_key=True)
    product_code: Mapped[str] = mapped_column(Unicode(50), unique=True)  # SKU, e.g. PRD-1009
    barcode: Mapped[str | None] = mapped_column(Unicode(50), unique=True, index=True)
    name: Mapped[str] = mapped_column(Unicode(150))

    category_id: Mapped[int] = mapped_column(ForeignKey("Categories.category_id"))
    brand_id: Mapped[int | None] = mapped_column(ForeignKey("Brands.brand_id"))
    unit_id: Mapped[int] = mapped_column(ForeignKey("Units.unit_id"))
    tax_rate_id: Mapped[int | None] = mapped_column(ForeignKey("TaxRates.tax_rate_id"))

    purchase_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), server_default="0")
    sale_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), server_default="0")
    tax_percent: Mapped[Decimal] = mapped_column(Numeric(5, 2), server_default="0")  # stored, not applied here

    reorder_level: Mapped[int] = mapped_column(server_default="0")
    current_quantity: Mapped[int] = mapped_column(server_default="0")  # owned/written by Module 4

    expiry_tracking: Mapped[bool] = mapped_column(server_default=text("0"))
    image_path: Mapped[str | None] = mapped_column(Unicode(255))
    description: Mapped[str | None] = mapped_column(Unicode(500))
    status: Mapped[str] = mapped_column(Unicode(10), server_default="active")  # active | inactive

    created_at: Mapped[datetime] = mapped_column(server_default=func.sysutcdatetime())
    updated_at: Mapped[datetime | None] = mapped_column(onupdate=func.sysutcdatetime())

    category: Mapped["Category"] = relationship(back_populates="products")
    brand: Mapped["Brand | None"] = relationship(back_populates="products")
    unit: Mapped["Unit"] = relationship(back_populates="products")
    tax_rate: Mapped["TaxRate | None"] = relationship(back_populates="products")
