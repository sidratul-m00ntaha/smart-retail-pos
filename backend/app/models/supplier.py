# # from sqlalchemy import Column, Integer, String, DateTime
# # from sqlalchemy.orm import relationship
# # from sqlalchemy.sql import func

# # from app.database import Base


# # class Supplier(Base):
# #     __tablename__ = "Suppliers"

# #     SupplierID = Column(Integer, primary_key=True, autoincrement=True)
# #     Name = Column(String(150), nullable=False)
# #     Phone = Column(String(30), nullable=False)
# #     Email = Column(String(150), nullable=True)
# #     Address = Column(String(255), nullable=True)
# #     Status = Column(String(10), nullable=False, default="Active")  # "Active" | "Inactive"
# #     CreatedAt = Column(DateTime, server_default=func.getdate())

# #     purchases = relationship("Purchase", back_populates="supplier")
# #     payments = relationship("SupplierPayment", back_populates="supplier")

# #----------------------------------------------------------------

# """Suppliers table (PRD 5.5).
 
# What the store owes a supplier is NOT stored here. It is always worked out from the supplier's
# purchases (see supplier_service.supplier_totals), so it can never disagree with them.
# """
# from datetime import datetime
 
# from sqlalchemy import Unicode, func
# from sqlalchemy.orm import Mapped, mapped_column, relationship
 
# from app.database import Base
 
 
# class Supplier(Base):
#     __tablename__ = "Suppliers"
 
#     supplier_id: Mapped[int] = mapped_column(primary_key=True)
#     name: Mapped[str] = mapped_column(Unicode(150), unique=True)
#     phone: Mapped[str] = mapped_column(Unicode(30))
#     email: Mapped[str | None] = mapped_column(Unicode(255))
#     address: Mapped[str | None] = mapped_column(Unicode(255))
#     status: Mapped[str] = mapped_column(Unicode(10), server_default="active")  # active | inactive
#     created_at: Mapped[datetime] = mapped_column(server_default=func.sysutcdatetime())
#     updated_at: Mapped[datetime | None] = mapped_column(onupdate=func.sysutcdatetime())
 
#     purchases: Mapped[list["Purchase"]] = relationship(back_populates="supplier")
#     payments: Mapped[list["SupplierPayment"]] = relationship(back_populates="supplier")
 




"""Suppliers table (PRD 5.5).

What the store owes a supplier is NOT stored here. It is always worked out from the supplier's
purchases (see supplier_service.supplier_totals), so it can never disagree with them.
"""
from datetime import datetime

from sqlalchemy import Unicode, func
from sqlalchemy.orm import Mapped, mapped_column, relationship, synonym

from app.database import Base


class Supplier(Base):
    __tablename__ = "Suppliers"

    supplier_id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(Unicode(150), unique=True)
    phone: Mapped[str] = mapped_column(Unicode(30))
    email: Mapped[str | None] = mapped_column(Unicode(255))
    address: Mapped[str | None] = mapped_column(Unicode(255))
    status: Mapped[str] = mapped_column(Unicode(10), server_default="active")  # active | inactive
    created_at: Mapped[datetime] = mapped_column(server_default=func.sysutcdatetime())
    updated_at: Mapped[datetime | None] = mapped_column(onupdate=func.sysutcdatetime())

    purchases: Mapped[list["Purchase"]] = relationship(back_populates="supplier")
    payments: Mapped[list["SupplierPayment"]] = relationship(back_populates="supplier")

    # Old attribute names. Module 1's AI Assistant (services/ai/report_functions.py) still uses them, so they
    # stay as aliases of the new columns. Nothing new should use them; delete once that file uses the new names.
    SupplierID = synonym("supplier_id")
    Name = synonym("name")
