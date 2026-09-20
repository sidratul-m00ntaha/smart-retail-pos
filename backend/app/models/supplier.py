from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class Supplier(Base):
    __tablename__ = "Suppliers"

    SupplierID = Column(Integer, primary_key=True, autoincrement=True)
    Name = Column(String(150), nullable=False)
    Phone = Column(String(30), nullable=False)
    Email = Column(String(150), nullable=True)
    Address = Column(String(255), nullable=True)
    Status = Column(String(10), nullable=False, default="Active")  # "Active" | "Inactive"
    CreatedAt = Column(DateTime, server_default=func.getdate())

    purchases = relationship("Purchase", back_populates="supplier")
    payments = relationship("SupplierPayment", back_populates="supplier")