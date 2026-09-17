from pydantic import BaseModel, computed_field
from decimal import Decimal
from typing import Optional

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

    # Computed field: safely calculates available credit in Python (Decimal)
    # so the frontend never has to do risky JavaScript float math.
    @computed_field
    @property
    def available_credit(self) -> Decimal:
        return self.credit_limit - self.outstanding_due

    class Config:
        from_attributes = True  # Required for Pydantic V2 to read SQLAlchemy models