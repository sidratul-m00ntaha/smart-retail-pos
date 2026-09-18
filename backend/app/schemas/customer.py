from pydantic import BaseModel, computed_field
from decimal import Decimal
from typing import Optional
from datetime import datetime  # <-- ADDED THIS IMPORT

class CustomerCreate(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None
    address: Optional[str] = None
    credit_limit: Decimal = Decimal("0.00")

class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    credit_limit: Optional[Decimal] = None
    status: Optional[str] = None

class CustomerRead(BaseModel):
    customer_id: int
    name: str
    phone: str
    email: Optional[str]
    address: Optional[str]
    credit_limit: Decimal
    outstanding_due: Decimal
    loyalty_points: int
    status: str

    # Computed field belongs HERE in CustomerRead
    @computed_field
    @property
    def available_credit(self) -> Decimal:
        return self.credit_limit - self.outstanding_due

    class Config:
        from_attributes = True

class PaymentCreate(BaseModel):
    customer_id: int
    amount: Decimal
    method: str  # "cash", "card", or "digital"

class PaymentRead(BaseModel):
    customer_payment_id: int
    customer_id: int
    amount: Decimal
    method: str
    created_at: datetime

    class Config:
        from_attributes = True
class PointsCalculation(BaseModel):
    sale_amount: Decimal

class LoyaltyTierCreate(BaseModel):
    name: str
    required_points: int
    discount_percent: Decimal

class LoyaltyTierUpdate(BaseModel):
    name: Optional[str] = None
    required_points: Optional[int] = None
    discount_percent: Optional[Decimal] = None

class LoyaltyTierRead(BaseModel):
    loyalty_tier_id: int
    name: str
    required_points: int
    discount_percent: Decimal

    class Config:
        from_attributes = True
class CheckCreditPayload(BaseModel):
    customer_id: int
    sale_amount: Decimal

class AddDuePayload(BaseModel):
    customer_id: int
    amount: Decimal

class AddPointsPayload(BaseModel):
    customer_id: int
    points: int