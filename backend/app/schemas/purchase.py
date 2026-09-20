from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, Field, field_validator


class PurchaseItemCreate(BaseModel):
    ProductID: int
    Quantity: Decimal = Field(..., gt=0)
    UnitPrice: Decimal = Field(..., ge=0)


class PurchaseItemOut(BaseModel):
    PurchaseItemID: int
    ProductID: int
    Quantity: Decimal
    UnitPrice: Decimal
    LineTotal: Decimal

    class Config:
        from_attributes = True


class PurchaseCreate(BaseModel):
    SupplierID: int
    Items: List[PurchaseItemCreate]
    Discount: Decimal = Decimal("0")
    VATRate: Decimal = Decimal("0.05")  # matches the 15% / 5% / 0% options in the drawer
    Paid: Decimal = Decimal("0")

    @field_validator("Items")
    @classmethod
    def at_least_one_item(cls, v):
        if not v:
            raise ValueError("Add at least one line item with a positive quantity and unit price.")
        return v


class PurchaseOut(BaseModel):
    PurchaseID: int
    PurchaseNo: str
    SupplierID: int
    SupplierName: Optional[str] = None
    PurchaseDate: datetime
    Subtotal: Decimal
    Discount: Decimal
    VAT: Decimal
    Total: Decimal
    Paid: Decimal
    Due: Decimal
    Status: str
    Items: List[PurchaseItemOut] = []

    class Config:
        from_attributes = True
