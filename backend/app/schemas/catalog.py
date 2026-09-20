"""Shapes of the categories/brands/units/tax-rates APIs' requests and responses."""
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator

from app.schemas.common import UtcDateTime

Status = Literal["active", "inactive"]


def _strip(value: object) -> object:
    return value.strip() if isinstance(value, str) else value


class CategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    status: Status = "active"

    _strip_name = field_validator("name", mode="before")(_strip)


class CategoryUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    status: Optional[Status] = None

    _strip_name = field_validator("name", mode="before")(_strip)


class CategoryOut(BaseModel):
    model_config = {"from_attributes": True}
    category_id: int
    name: str
    status: Status
    created_at: UtcDateTime


class BrandCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    status: Status = "active"

    _strip_name = field_validator("name", mode="before")(_strip)


class BrandUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    status: Optional[Status] = None

    _strip_name = field_validator("name", mode="before")(_strip)


class BrandOut(BaseModel):
    model_config = {"from_attributes": True}
    brand_id: int
    name: str
    status: Status
    created_at: UtcDateTime


class UnitCreate(BaseModel):
    name: str = Field(min_length=1, max_length=50)
    status: Status = "active"

    _strip_name = field_validator("name", mode="before")(_strip)


class UnitUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=50)
    status: Optional[Status] = None

    _strip_name = field_validator("name", mode="before")(_strip)


class UnitOut(BaseModel):
    model_config = {"from_attributes": True}
    unit_id: int
    name: str
    status: Status
    created_at: UtcDateTime


class TaxRateCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    rate_percent: Decimal = Field(ge=0, le=100)
    status: Status = "active"

    _strip_name = field_validator("name", mode="before")(_strip)


class TaxRateUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    rate_percent: Optional[Decimal] = Field(default=None, ge=0, le=100)
    status: Optional[Status] = None

    _strip_name = field_validator("name", mode="before")(_strip)


class TaxRateOut(BaseModel):
    model_config = {"from_attributes": True}
    tax_rate_id: int
    name: str
    rate_percent: Decimal
    status: Status
    created_at: UtcDateTime
