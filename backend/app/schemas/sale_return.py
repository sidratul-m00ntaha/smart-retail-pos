"""Request and response shapes for returns (cancelling an item after the invoice)."""
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.common import UtcDateTime


class ReturnLineIn(BaseModel):
    sale_item_id: int
    quantity: Decimal = Field(gt=0, max_digits=15, decimal_places=3)
    restock: bool = True  # false for damaged or expired goods


class SaleReturnCreate(BaseModel):
    reason: str = Field(min_length=1, max_length=255)
    items: list[ReturnLineIn] = Field(min_length=1)
    # Only asked for the part not covered by reducing the customer's due; omit for a guest sale.
    refund_method: Literal["cash", "card", "digital"] | None = None


class SaleReturnItemOut(BaseModel):
    sale_item_id: int
    product_name: str
    quantity: Decimal
    amount: Decimal
    restocked: bool


class SaleReturnOut(BaseModel):
    sale_return_id: int
    sale_id: int
    invoice_number: str
    return_number: str  # e.g. RET-2026-00007
    reason: str
    refund_amount: Decimal
    refund_method: str | None
    due_reduced: Decimal
    processed_by_name: str | None
    created_at: UtcDateTime
    items: list[SaleReturnItemOut]
