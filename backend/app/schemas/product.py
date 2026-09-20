"""Shapes of the products API's requests and responses."""
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator

from app.schemas.catalog import BrandOut, CategoryOut, TaxRateOut, UnitOut
from app.schemas.common import UtcDateTime

Status = Literal["active", "inactive"]


class ProductCreate(BaseModel):
    product_code: str = Field(min_length=1, max_length=50)
    barcode: Optional[str] = Field(default=None, max_length=50)
    name: str = Field(min_length=1, max_length=150)

    category_id: int
    brand_id: Optional[int] = None
    unit_id: int
    tax_rate_id: Optional[int] = None

    purchase_price: Decimal = Field(default=0, ge=0)
    sale_price: Decimal = Field(default=0, ge=0)
    tax_percent: Decimal = Field(default=0, ge=0, le=100)

    reorder_level: int = Field(default=0, ge=0)
    expiry_tracking: bool = False
    image_path: Optional[str] = None
    description: Optional[str] = Field(default=None, max_length=500)
    status: Status = "active"

    @field_validator("product_code", "name", mode="before")
    @classmethod
    def strip_spaces(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value

    @field_validator("barcode", mode="before")
    @classmethod
    def clean_barcode(cls, value: object) -> object:
        if not isinstance(value, str):
            return value
        value = value.strip()
        return value or None


class ProductUpdate(BaseModel):
    """All fields optional for partial updates."""
    product_code: Optional[str] = Field(default=None, min_length=1, max_length=50)
    barcode: Optional[str] = Field(default=None, max_length=50)
    name: Optional[str] = Field(default=None, min_length=1, max_length=150)
    category_id: Optional[int] = None
    brand_id: Optional[int] = None
    unit_id: Optional[int] = None
    tax_rate_id: Optional[int] = None
    purchase_price: Optional[Decimal] = Field(default=None, ge=0)
    sale_price: Optional[Decimal] = Field(default=None, ge=0)
    tax_percent: Optional[Decimal] = Field(default=None, ge=0, le=100)
    reorder_level: Optional[int] = Field(default=None, ge=0)
    expiry_tracking: Optional[bool] = None
    image_path: Optional[str] = None
    description: Optional[str] = Field(default=None, max_length=500)
    status: Optional[Status] = None

    @field_validator("product_code", "name", mode="before")
    @classmethod
    def strip_spaces(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value

    @field_validator("barcode", mode="before")
    @classmethod
    def clean_barcode(cls, value: object) -> object:
        if not isinstance(value, str):
            return value
        value = value.strip()
        return value or None


class ProductOut(BaseModel):
    model_config = {"from_attributes": True}
    product_id: int
    product_code: str
    barcode: Optional[str]
    name: str
    category_id: int
    brand_id: Optional[int]
    unit_id: int
    tax_rate_id: Optional[int]
    purchase_price: Decimal
    sale_price: Decimal
    tax_percent: Decimal
    reorder_level: int
    current_quantity: int
    expiry_tracking: bool
    image_path: Optional[str]
    description: Optional[str]
    status: Status
    created_at: UtcDateTime
    updated_at: Optional[UtcDateTime]
    category: Optional[CategoryOut] = None
    brand: Optional[BrandOut] = None
    unit: Optional[UnitOut] = None
    tax_rate: Optional[TaxRateOut] = None


class ProductLookupOut(BaseModel):
    """Slim shape for the POS/Purchasing barcode-or-SKU lookup (module hand-off)."""
    model_config = {"from_attributes": True}
    product_id: int
    product_code: str
    barcode: Optional[str]
    name: str
    sale_price: Decimal
    purchase_price: Decimal
    tax_percent: Decimal
    current_quantity: int
    status: Status


class ProductStats(BaseModel):
    total: int
    active: int
    inactive: int
    low_stock: int
    out_of_stock: int
