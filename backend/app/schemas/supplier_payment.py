# """Shapes of the supplier payments API's requests and responses (PRD 5.7)."""
# from decimal import Decimal

# from pydantic import BaseModel, Field, field_validator

# from app.schemas.common import UtcDateTime
# from app.schemas.purchase import PaymentMethod


# class SupplierPaymentCreate(BaseModel):
#     supplier_id: int
#     amount: Decimal = Field(gt=0, max_digits=16, decimal_places=2)
#     method: PaymentMethod
#     # Leave out to spread the payment over the supplier's oldest open purchases
#     purchase_id: int | None = None
#     note: str | None = Field(default=None, max_length=255)

#     @field_validator("note", mode="before")
#     @classmethod
#     def clean_note(cls, value: object) -> object:
#         if not isinstance(value, str):
#             return value
#         return value.strip() or None


# class SupplierPaymentOut(BaseModel):
#     supplier_payment_id: int
#     supplier_id: int
#     supplier_name: str
#     purchase_id: int | None
#     purchase_number: str | None
#     amount: Decimal
#     method: str
#     note: str | None
#     created_by: int | None
#     created_by_name: str | None
#     created_at: UtcDateTime



















"""Shapes of the supplier payments API's requests and responses (PRD 5.7)."""
from decimal import Decimal

from pydantic import BaseModel, Field, field_validator

from app.schemas.common import UtcDateTime
from app.schemas.purchase import PaymentMethod


class SupplierPaymentCreate(BaseModel):
    supplier_id: int
    amount: Decimal = Field(gt=0, max_digits=16, decimal_places=2)
    method: PaymentMethod
    # Leave out to spread the payment over the supplier's oldest open purchases
    purchase_id: int | None = None
    note: str | None = Field(default=None, max_length=255)

    @field_validator("note", mode="before")
    @classmethod
    def clean_note(cls, value: object) -> object:
        if not isinstance(value, str):
            return value
        return value.strip() or None


class SupplierPaymentOut(BaseModel):
    supplier_payment_id: int
    supplier_id: int
    supplier_name: str
    purchase_id: int | None
    purchase_number: str | None
    amount: Decimal
    method: str
    note: str | None
    created_by: int | None
    created_by_name: str | None
    created_at: UtcDateTime