from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field


class SupplierBase(BaseModel):
    Name: str = Field(..., min_length=1, max_length=150)
    Phone: str = Field(..., min_length=1, max_length=30)
    Email: Optional[str] = None
    Address: Optional[str] = None
    Status: str = "Active"  # "Active" | "Inactive"


class SupplierCreate(SupplierBase):
    pass


class SupplierUpdate(SupplierBase):
    pass


class SupplierOut(SupplierBase):
    SupplierID: int
    TotalPurchases: Decimal = Decimal("0")
    Due: Decimal = Decimal("0")
    CreatedAt: datetime

    class Config:
        from_attributes = True


class SupplierPaymentCreate(BaseModel):
    Amount: Decimal = Field(..., gt=0)
    Method: str = "Cash"  # "Cash" | "Bank" | "Digital"
    PurchaseID: Optional[int] = None


class SupplierPaymentOut(BaseModel):
    PaymentID: int
    SupplierID: int
    SupplierName: Optional[str] = None
    PurchaseID: Optional[int] = None
    PurchaseNo: Optional[str] = None
    Amount: Decimal
    Method: str
    PaymentDate: datetime

    class Config:
        from_attributes = True
