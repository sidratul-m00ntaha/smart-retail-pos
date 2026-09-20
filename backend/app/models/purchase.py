from sqlalchemy import Column, Integer, String, DECIMAL, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class Purchase(Base):
    __tablename__ = "Purchases"

    PurchaseID = Column(Integer, primary_key=True, autoincrement=True)
    PurchaseNo = Column(String(20), unique=True, nullable=False, index=True)
    SupplierID = Column(Integer, ForeignKey("Suppliers.SupplierID"), nullable=False)
    PurchaseDate = Column(DateTime, server_default=func.getdate())
    Subtotal = Column(DECIMAL(12, 2), nullable=False, default=0)
    Discount = Column(DECIMAL(12, 2), nullable=False, default=0)
    VAT = Column(DECIMAL(12, 2), nullable=False, default=0)
    Total = Column(DECIMAL(12, 2), nullable=False, default=0)
    Paid = Column(DECIMAL(12, 2), nullable=False, default=0)
    Due = Column(DECIMAL(12, 2), nullable=False, default=0)
    Status = Column(String(20), nullable=False, default="Confirmed")
    CreatedByUserID = Column(Integer, nullable=True)  # FK -> Users (Module 1), added once that table exists
    CreatedAt = Column(DateTime, server_default=func.getdate())

    supplier = relationship("Supplier", back_populates="purchases")
    items = relationship("PurchaseItem", back_populates="purchase", cascade="all, delete-orphan")


class PurchaseItem(Base):
    __tablename__ = "PurchaseItems"

    PurchaseItemID = Column(Integer, primary_key=True, autoincrement=True)
    PurchaseID = Column(Integer, ForeignKey("Purchases.PurchaseID"), nullable=False)
    ProductID = Column(Integer, nullable=False)  # FK -> Products (Module 2), add ForeignKey() once that table merges
    Quantity = Column(DECIMAL(10, 2), nullable=False)
    UnitPrice = Column(DECIMAL(12, 2), nullable=False)
    LineTotal = Column(DECIMAL(12, 2), nullable=False)

    purchase = relationship("Purchase", back_populates="items")


class SupplierPayment(Base):
    __tablename__ = "SupplierPayments"

    PaymentID = Column(Integer, primary_key=True, autoincrement=True)
    SupplierID = Column(Integer, ForeignKey("Suppliers.SupplierID"), nullable=False)
    PurchaseID = Column(Integer, ForeignKey("Purchases.PurchaseID"), nullable=True)
    Amount = Column(DECIMAL(12, 2), nullable=False)
    Method = Column(String(20), nullable=False, default="Cash")  # "Cash" | "Bank" | "Digital"
    PaymentDate = Column(DateTime, server_default=func.getdate())
    CreatedByUserID = Column(Integer, nullable=True)

    supplier = relationship("Supplier", back_populates="payments")
    purchase = relationship("Purchase")  # optional link — a payment can be a general payment, not tied to one purchase
