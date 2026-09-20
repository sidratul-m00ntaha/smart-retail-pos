"""Customers, Loyalty Tiers, Payments, and Transactions tables."""
from datetime import datetime

from sqlalchemy import ForeignKey, Unicode, Integer, Numeric, func, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

class Customer(Base):
    __tablename__ = "Customers"

    customer_id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(Unicode(100))
    phone: Mapped[str] = mapped_column(Unicode(30), unique=True)
    email: Mapped[str | None] = mapped_column(Unicode(150), default=None)
    address: Mapped[str | None] = mapped_column(Unicode(255), default=None)
    credit_limit: Mapped[float] = mapped_column(Numeric(18, 2), server_default=text("0"))
    outstanding_due: Mapped[float] = mapped_column(Numeric(18, 2), server_default=text("0"))
    loyalty_points: Mapped[int] = mapped_column(server_default=text("0"))
    loyalty_tier_id: Mapped[int | None] = mapped_column(ForeignKey("LoyaltyTiers.loyalty_tier_id"), default=None)
    status: Mapped[str] = mapped_column(Unicode(20), server_default=text("'active'"))
    created_at: Mapped[datetime] = mapped_column(server_default=func.sysutcdatetime())
    
    # Relationships
    loyalty_transactions = relationship("LoyaltyTransaction", back_populates="customer")
    loyalty_tier: Mapped["LoyaltyTier"] = relationship(back_populates="customers")

class LoyaltyTier(Base):
    __tablename__ = "LoyaltyTiers"

    loyalty_tier_id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(Unicode(50))  # Regular, Silver, Gold
    required_points: Mapped[int] = mapped_column()
    discount_percent: Mapped[float] = mapped_column(Numeric(5, 2))

    customers: Mapped[list["Customer"]] = relationship(back_populates="loyalty_tier")

class CustomerPayment(Base):
    __tablename__ = "CustomerPayments"

    customer_payment_id: Mapped[int] = mapped_column(primary_key=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("Customers.customer_id"))
    amount: Mapped[float] = mapped_column(Numeric(18, 2))
    method: Mapped[str] = mapped_column(Unicode(20))
    recorded_by: Mapped[int | None] = mapped_column(ForeignKey("Users.user_id"), default=None)
    created_at: Mapped[datetime] = mapped_column(server_default=func.sysutcdatetime())

# --- THIS IS THE ONLY LOYALTY TRANSACTION CLASS NEEDED ---
class LoyaltyTransaction(Base):
    __tablename__ = "LoyaltyTransactions"

    loyalty_transaction_id: Mapped[int] = mapped_column(primary_key=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("Customers.customer_id"))
    sale_id: Mapped[int | None] = mapped_column(default=None)
    transaction_type: Mapped[str] = mapped_column(Unicode(20))
    points: Mapped[int] = mapped_column()
    description: Mapped[str | None] = mapped_column(Unicode(255), default=None)
    created_at: Mapped[datetime] = mapped_column(server_default=func.sysutcdatetime())
    
    customer = relationship("Customer", back_populates="loyalty_transactions")