# # from datetime import datetime
# # from decimal import Decimal
# # from typing import List, Optional

# # from pydantic import BaseModel, Field, field_validator


# # class PurchaseItemCreate(BaseModel):
# #     ProductID: int
# #     Quantity: Decimal = Field(..., gt=0)
# #     UnitPrice: Decimal = Field(..., ge=0)


# # class PurchaseItemOut(BaseModel):
# #     PurchaseItemID: int
# #     ProductID: int
# #     Quantity: Decimal
# #     UnitPrice: Decimal
# #     LineTotal: Decimal

# #     class Config:
# #         from_attributes = True


# # class PurchaseCreate(BaseModel):
# #     SupplierID: int
# #     Items: List[PurchaseItemCreate]
# #     Discount: Decimal = Decimal("0")
# #     VATRate: Decimal = Decimal("0.05")  # matches the 15% / 5% / 0% options in the drawer
# #     Paid: Decimal = Decimal("0")

# #     @field_validator("Items")
# #     @classmethod
# #     def at_least_one_item(cls, v):
# #         if not v:
# #             raise ValueError("Add at least one line item with a positive quantity and unit price.")
# #         return v


# # class PurchaseOut(BaseModel):
# #     PurchaseID: int
# #     PurchaseNo: str
# #     SupplierID: int
# #     SupplierName: Optional[str] = None
# #     PurchaseDate: datetime
# #     Subtotal: Decimal
# #     Discount: Decimal
# #     VAT: Decimal
# #     Total: Decimal
# #     Paid: Decimal
# #     Due: Decimal
# #     Status: str
# #     Items: List[PurchaseItemOut] = []

# #     class Config:
# #         from_attributes = True


# #----------------------------------------------------------------
# """Shapes of the purchases API's requests and responses (PRD 5.6)."""
# from datetime import date
# from decimal import Decimal
# from typing import Literal

# from pydantic import BaseModel, ConfigDict, Field, field_validator

# from app.schemas.common import UtcDateTime

# PaymentMethod = Literal["cash", "bank", "digital"]
# PaymentStatus = Literal["PAID", "PARTIALLY_PAID", "DUE"]


# class PurchaseItemIn(BaseModel):
#     """One line of a new purchase. The manager sends the product, quantity and the price agreed with the supplier."""

#     product_id: int
#     quantity: Decimal = Field(gt=0, max_digits=15, decimal_places=3)  # whole numbers only, checked by the service
#     unit_price: Decimal = Field(gt=0, max_digits=16, decimal_places=2)
#     line_discount_percent: Decimal = Field(default=Decimal("0"), ge=0, le=100, max_digits=5, decimal_places=2)
#     # Required for products with expiry tracking, ignored for the others
#     batch_number: str | None = Field(default=None, max_length=50)
#     expiry_date: date | None = None

#     @field_validator("batch_number", mode="before")
#     @classmethod
#     def clean_batch_number(cls, value: object) -> object:
#         if not isinstance(value, str):
#             return value
#         return value.strip() or None


# class PurchaseCreate(BaseModel):
#     supplier_id: int
#     items: list[PurchaseItemIn] = Field(min_length=1)
#     discount_amount: Decimal = Field(default=Decimal("0"), ge=0, max_digits=16, decimal_places=2)
#     tax_rate_id: int | None = None  # a VAT rate from Settings; empty = no VAT
#     shipping_charge: Decimal = Field(default=Decimal("0"), ge=0, max_digits=16, decimal_places=2)
#     paid_amount: Decimal = Field(default=Decimal("0"), ge=0, max_digits=16, decimal_places=2)
#     payment_method: PaymentMethod | None = None  # required when paid_amount is more than 0
#     note: str | None = Field(default=None, max_length=255)

#     @field_validator("note", mode="before")
#     @classmethod
#     def clean_note(cls, value: object) -> object:
#         if not isinstance(value, str):
#             return value
#         return value.strip() or None


# class PurchaseItemOut(BaseModel):
#     model_config = ConfigDict(from_attributes=True)

#     purchase_item_id: int
#     product_id: int
#     product_name: str
#     quantity: Decimal
#     unit_price: Decimal
#     line_discount_percent: Decimal
#     line_total: Decimal
#     batch_number: str | None
#     expiry_date: date | None


# class PurchaseListOut(BaseModel):
#     """A purchase without its lines, for the list."""

#     purchase_id: int
#     purchase_number: str
#     supplier_id: int
#     supplier_name: str
#     subtotal: Decimal
#     discount_amount: Decimal
#     tax_rate_id: int | None
#     tax_percent: Decimal
#     tax_amount: Decimal
#     shipping_charge: Decimal
#     total_amount: Decimal
#     paid_amount: Decimal
#     due_amount: Decimal
#     payment_status: PaymentStatus
#     status: str
#     note: str | None
#     created_by: int | None
#     created_by_name: str | None
#     created_at: UtcDateTime
#     item_count: int


# class PurchaseOut(PurchaseListOut):
#     items: list[PurchaseItemOut]






"""Shapes of the purchases API's requests and responses (PRD 5.6)."""
from datetime import date
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.common import UtcDateTime

PaymentMethod = Literal["cash", "bank", "digital"]
PaymentStatus = Literal["PAID", "PARTIALLY_PAID", "DUE"]


class PurchaseItemIn(BaseModel):
    """One line of a new purchase. The manager sends the product, quantity and the price agreed with the supplier."""

    product_id: int
    quantity: Decimal = Field(gt=0, max_digits=15, decimal_places=3)  # whole numbers only, checked by the service
    unit_price: Decimal = Field(gt=0, max_digits=16, decimal_places=2)
    line_discount_percent: Decimal = Field(default=Decimal("0"), ge=0, le=100, max_digits=5, decimal_places=2)
    # Required for products with expiry tracking, ignored for the others
    batch_number: str | None = Field(default=None, max_length=50)
    expiry_date: date | None = None

    @field_validator("batch_number", mode="before")
    @classmethod
    def clean_batch_number(cls, value: object) -> object:
        if not isinstance(value, str):
            return value
        return value.strip() or None


class PurchaseCreate(BaseModel):
    supplier_id: int
    items: list[PurchaseItemIn] = Field(min_length=1)
    discount_amount: Decimal = Field(default=Decimal("0"), ge=0, max_digits=16, decimal_places=2)
    tax_rate_id: int | None = None  # a VAT rate from Settings; empty = no VAT
    shipping_charge: Decimal = Field(default=Decimal("0"), ge=0, max_digits=16, decimal_places=2)
    paid_amount: Decimal = Field(default=Decimal("0"), ge=0, max_digits=16, decimal_places=2)
    payment_method: PaymentMethod | None = None  # required when paid_amount is more than 0
    note: str | None = Field(default=None, max_length=255)

    @field_validator("note", mode="before")
    @classmethod
    def clean_note(cls, value: object) -> object:
        if not isinstance(value, str):
            return value
        return value.strip() or None


class PurchaseItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    purchase_item_id: int
    product_id: int
    product_name: str
    quantity: Decimal
    unit_price: Decimal
    line_discount_percent: Decimal
    line_total: Decimal
    batch_number: str | None
    expiry_date: date | None


class PurchaseListOut(BaseModel):
    """A purchase without its lines, for the list."""

    purchase_id: int
    purchase_number: str
    supplier_id: int
    supplier_name: str
    subtotal: Decimal
    discount_amount: Decimal
    tax_rate_id: int | None
    tax_percent: Decimal
    tax_amount: Decimal
    shipping_charge: Decimal
    total_amount: Decimal
    paid_amount: Decimal
    due_amount: Decimal
    payment_status: PaymentStatus
    status: str
    note: str | None
    created_by: int | None
    created_by_name: str | None
    created_at: UtcDateTime
    item_count: int


class PurchaseOut(PurchaseListOut):
    items: list[PurchaseItemOut]