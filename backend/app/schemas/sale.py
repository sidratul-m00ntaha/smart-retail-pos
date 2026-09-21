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
    """A completed sale as an invoice document (PRD 5.17): the sale, its lines and payments, plus the header details."""

    sale_id: int
    invoice_number: str
    # Header details. The store's details are read from the store settings (Module 1) each time the invoice is
    # produced, so a reprint shows the store's current name, address and phone.
    store_name: str
    store_address: str | None
    store_phone: str | None
    cashier_name: str | None
    customer_name: str | None  # None = guest
    customer_phone: str | None
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


class SaleListItem(BaseModel):
    """One row of the sales / invoices list."""

    sale_id: int
    invoice_number: str
    created_at: UtcDateTime
    customer_id: int | None
    customer_name: str | None
    customer_phone: str | None
    cashier_name: str | None
    item_count: Decimal  # units sold on the sale
    total_amount: Decimal
    paid_amount: Decimal
    due_amount: Decimal
    payment_status: str
    status: str


class SaleListTotals(BaseModel):
    """Sums over ALL rows that match the filters, not just the page being shown."""

    transactions: int
    total_amount: Decimal
    paid_amount: Decimal
    due_amount: Decimal


class SaleListPage(BaseModel):
    items: list[SaleListItem]
    total: int
    page: int
    page_size: int
    totals: SaleListTotals
