# # from datetime import datetime
# # from decimal import Decimal
# # from typing import Optional

# # from pydantic import BaseModel, Field


# # class SupplierBase(BaseModel):
# #     Name: str = Field(..., min_length=1, max_length=150)
# #     Phone: str = Field(..., min_length=1, max_length=30)
# #     Email: Optional[str] = None
# #     Address: Optional[str] = None
# #     Status: str = "Active"  # "Active" | "Inactive"


# # class SupplierCreate(SupplierBase):
# #     pass


# # class SupplierUpdate(SupplierBase):
# #     pass


# # class SupplierOut(SupplierBase):
# #     SupplierID: int
# #     TotalPurchases: Decimal = Decimal("0")
# #     Due: Decimal = Decimal("0")
# #     CreatedAt: datetime

# #     class Config:
# #         from_attributes = True


# # class SupplierPaymentCreate(BaseModel):
# #     Amount: Decimal = Field(..., gt=0)
# #     Method: str = "Cash"  # "Cash" | "Bank" | "Digital"
# #     PurchaseID: Optional[int] = None


# # class SupplierPaymentOut(BaseModel):
# #     PaymentID: int
# #     SupplierID: int
# #     SupplierName: Optional[str] = None
# #     PurchaseID: Optional[int] = None
# #     PurchaseNo: Optional[str] = None
# #     Amount: Decimal
# #     Method: str
# #     PaymentDate: datetime

# #     class Config:
# #         from_attributes = True

# #----------------------------------------------------------------
# """Shapes of the suppliers API's requests and responses (PRD 5.5)."""
# from decimal import Decimal
# from typing import Literal

# from pydantic import BaseModel, Field, ValidationInfo, field_validator

# from app.schemas.common import UtcDateTime

# # Same rules as the users and store settings schemas
# EMAIL_PATTERN = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"
# PHONE_PATTERN = r"^[0-9+()\- ]+$"

# SupplierStatus = Literal["active", "inactive"]


# class SupplierFields(BaseModel):
#     name: str = Field(min_length=1, max_length=150)
#     phone: str = Field(min_length=1, max_length=30, pattern=PHONE_PATTERN)
#     email: str | None = Field(default=None, max_length=255, pattern=EMAIL_PATTERN)
#     address: str | None = Field(default=None, max_length=255)
#     status: SupplierStatus = "active"

#     @field_validator("name", "phone", mode="before")
#     @classmethod
#     def strip_spaces(cls, value: object) -> object:
#         return value.strip() if isinstance(value, str) else value

#     @field_validator("email", "address", mode="before")
#     @classmethod
#     def clean_optional_text(cls, value: object, info: ValidationInfo) -> object:
#         """Removes spaces around the text; an empty box is saved as empty (NULL)."""
#         if not isinstance(value, str):
#             return value
#         value = value.strip()
#         if info.field_name == "email":
#             value = value.lower()
#         return value or None


# class SupplierCreate(SupplierFields):
#     pass


# class SupplierUpdate(SupplierFields):
#     status: SupplierStatus  # required when editing, so a supplier can't be reactivated by accident


# class SupplierOut(BaseModel):
#     supplier_id: int
#     name: str
#     phone: str
#     email: str | None
#     address: str | None
#     status: SupplierStatus
#     # Worked out from the supplier's purchases (PRD 5.7)
#     purchase_count: int
#     total_purchases: Decimal
#     total_paid: Decimal
#     outstanding_due: Decimal
#     created_at: UtcDateTime
#     updated_at: UtcDateTime | None
















"""Shapes of the suppliers API's requests and responses (PRD 5.5)."""
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field, ValidationInfo, field_validator

from app.schemas.common import UtcDateTime

# Same rules as the users and store settings schemas
EMAIL_PATTERN = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"
PHONE_PATTERN = r"^[0-9+()\- ]+$"

SupplierStatus = Literal["active", "inactive"]


class SupplierFields(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    phone: str = Field(min_length=1, max_length=30, pattern=PHONE_PATTERN)
    email: str | None = Field(default=None, max_length=255, pattern=EMAIL_PATTERN)
    address: str | None = Field(default=None, max_length=255)
    status: SupplierStatus = "active"

    @field_validator("name", "phone", mode="before")
    @classmethod
    def strip_spaces(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value

    @field_validator("email", "address", mode="before")
    @classmethod
    def clean_optional_text(cls, value: object, info: ValidationInfo) -> object:
        """Removes spaces around the text; an empty box is saved as empty (NULL)."""
        if not isinstance(value, str):
            return value
        value = value.strip()
        if info.field_name == "email":
            value = value.lower()
        return value or None


class SupplierCreate(SupplierFields):
    pass


class SupplierUpdate(SupplierFields):
    status: SupplierStatus  # required when editing, so a supplier can't be reactivated by accident


class SupplierOut(BaseModel):
    supplier_id: int
    name: str
    phone: str
    email: str | None
    address: str | None
    status: SupplierStatus
    # Worked out from the supplier's purchases (PRD 5.7)
    purchase_count: int
    total_purchases: Decimal
    total_paid: Decimal
    outstanding_due: Decimal
    created_at: UtcDateTime
    updated_at: UtcDateTime | None