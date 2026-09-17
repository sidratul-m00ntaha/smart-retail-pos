"""Shapes of the store settings API's requests and responses."""
from typing import Literal

from pydantic import BaseModel, Field, ValidationInfo, field_validator

from app.schemas.common import UtcDateTime
from app.schemas.user import EMAIL_PATTERN

# Currency code -> symbol shown on screens and invoices. Same list as the settings page.
CURRENCY_SYMBOLS = {"BDT": "৳", "USD": "$", "INR": "₹"}
CurrencyCode = Literal["BDT", "USD", "INR"]

PHONE_PATTERN = r"^[0-9+()\- ]+$"
INVOICE_PREFIX_PATTERN = r"^[A-Za-z0-9-]+$"


class StoreSettingsUpdate(BaseModel):
    store_name: str = Field(min_length=1, max_length=150)
    address: str | None = Field(default=None, max_length=255)
    phone: str | None = Field(default=None, max_length=20, pattern=PHONE_PATTERN)
    email: str | None = Field(default=None, max_length=255, pattern=EMAIL_PATTERN)
    currency_code: CurrencyCode
    invoice_prefix: str = Field(min_length=1, max_length=10, pattern=INVOICE_PREFIX_PATTERN)
    loyalty_enabled: bool
    sms_enabled: bool
    sms_sender_name: str | None = Field(default=None, max_length=20)

    @field_validator("store_name", "invoice_prefix", mode="before")
    @classmethod
    def strip_spaces(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value

    @field_validator("address", "phone", "email", "sms_sender_name", mode="before")
    @classmethod
    def clean_optional_text(cls, value: object, info: ValidationInfo) -> object:
        """Removes spaces around the text; an empty box is saved as empty (NULL)."""
        if not isinstance(value, str):
            return value
        value = value.strip()
        if info.field_name == "email":
            value = value.lower()
        return value or None


class StoreSettingsOut(BaseModel):
    store_name: str
    address: str | None
    phone: str | None
    email: str | None
    currency_code: str
    currency_symbol: str
    invoice_prefix: str
    # Chosen on the VAT Rates page once Module 2 adds the TaxRates table
    default_tax_rate_id: int | None
    loyalty_enabled: bool
    sms_enabled: bool
    sms_sender_name: str | None
    updated_at: UtcDateTime | None
    updated_by_name: str | None
