"""Request and response shapes for Module 5 sales."""
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import UtcDateTime


class SaleLineIn(BaseModel):
    """One cart line. The browser sends only the product and quantity, never prices."""

    product_id: int
    quantity: Decimal = Field(gt=0, max_digits=15, decimal_places=3)


class PaymentIn(BaseModel):
    """Money received. A due amount is not sent: the server works it out as total - paid."""

    method: Literal["cash", "card", "digital"]
    amount: Decimal = Field(gt=0, max_digits=16, decimal_places=2)


class SaleCreate(BaseModel):
    customer_id: int | None = None  # None = guest
    items: list[SaleLineIn] = Field(min_length=1)
    payments: list[PaymentIn] = Field(default_factory=list)  # empty = everything on due
    held_cart_id: int | None = None  # set when the bill was resumed from a held cart


class SaleItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    sale_item_id: int
    product_id: int
    product_name: str
    quantity: Decimal
    unit_price: Decimal
    line_subtotal: Decimal
    discount_amount: Decimal
    tax_percent: Decimal
    tax_amount: Decimal
    line_total: Decimal


class PaymentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    payment_id: int
    method: str
    amount: Decimal


class SaleOut(BaseModel):
    sale_id: int
    invoice_number: str
    customer_id: int | None
    cashier_id: int
    subtotal: Decimal
    discount_percent: Decimal
    discount_amount: Decimal
    tax_amount: Decimal
    total_amount: Decimal
    paid_amount: Decimal
    due_amount: Decimal
    payment_status: str
    status: str
    created_at: UtcDateTime
    items: list[SaleItemOut]
    payments: list[PaymentOut]
