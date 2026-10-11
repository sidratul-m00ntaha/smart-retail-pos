"""Request and response shapes for the end-of-day closing report (Module 5 extension)."""
from datetime import date
from decimal import Decimal

from pydantic import BaseModel, Field

from app.schemas.common import UtcDateTime


class DayTotals(BaseModel):
    transactions: int
    gross_sales: Decimal  # sum of the sales totals made that day
    discount_amount: Decimal
    tax_amount: Decimal
    paid_amount: Decimal  # received at the till on those sales
    due_amount: Decimal  # left on customers' dues on those sales
    returns_total: Decimal  # value of the items returned that day
    net_sales: Decimal  # gross_sales - returns_total
    dues_collected: Decimal  # customers paying off old dues that day


class MethodTotals(BaseModel):
    method: str
    sales_received: Decimal  # paid on sales
    dues_received: Decimal  # paid towards customer dues
    refunded: Decimal  # paid back to customers
    net: Decimal  # sales_received + dues_received - refunded


class CashierTotals(BaseModel):
    cashier_id: int
    cashier_name: str | None
    transactions: int
    total_amount: Decimal
    cash_received: Decimal
    other_received: Decimal  # card, digital and mobile wallets
    due_amount: Decimal


class DayClosingOut(BaseModel):
    business_date: date
    opening_cash: Decimal
    expected_cash: Decimal
    counted_cash: Decimal
    difference: Decimal  # counted - expected; negative = cash is missing
    note: str | None
    closed_by_name: str | None
    updated_at: UtcDateTime


class DayCloseOut(BaseModel):
    business_date: date
    totals: DayTotals
    methods: list[MethodTotals]
    cashiers: list[CashierTotals]
    cash_net: Decimal  # cash sales + cash due payments - cash refunds: what the drawer gained that day
    suggested_opening_cash: Decimal  # the cash counted at the last closing before this day, or 0
    closing: DayClosingOut | None  # the saved closing, if this day has been closed


class DayCloseSave(BaseModel):
    business_date: date | None = None  # None = today
    opening_cash: Decimal = Field(ge=0, max_digits=16, decimal_places=2)
    counted_cash: Decimal = Field(ge=0, max_digits=16, decimal_places=2)
    note: str | None = Field(default=None, max_length=255)
