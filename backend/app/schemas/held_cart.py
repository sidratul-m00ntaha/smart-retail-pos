"""Request and response shapes for held carts (paused bills)."""
from decimal import Decimal

from pydantic import BaseModel, Field

from app.schemas.common import UtcDateTime
from app.schemas.sale import SaleLineIn


class HeldCartSave(BaseModel):
    """Used to hold a new bill and to save changes to a held one. Only product and quantity are kept."""

    customer_id: int | None = None
    note: str | None = Field(default=None, max_length=100)  # e.g. "red jacket, lane 2"
    items: list[SaleLineIn] = Field(min_length=1)


class HeldCartItemOut(BaseModel):
    product_id: int
    quantity: Decimal


class HeldCartOut(BaseModel):
    held_cart_id: int
    cashier_id: int
    cashier_name: str | None
    customer_id: int | None
    note: str | None
    status: str
    item_count: int
    created_at: UtcDateTime
    updated_at: UtcDateTime
    items: list[HeldCartItemOut]


class HeldCartResumeItem(BaseModel):
    """A held line, re-checked against today's product data and stock."""

    product_id: int
    quantity: Decimal
    product_name: str | None
    unit_price: Decimal | None
    vat_percent: Decimal | None
    available_quantity: int
    problem: str | None  # e.g. "Only 2 in stock." or "Product 9 was not found."


class HeldCartResumeOut(BaseModel):
    held_cart_id: int
    customer_id: int | None
    note: str | None
    created_at: UtcDateTime
    has_problems: bool
    items: list[HeldCartResumeItem]
