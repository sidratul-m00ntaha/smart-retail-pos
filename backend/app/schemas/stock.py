"""Shapes of the inventory API's requests and responses (PRD 5.8)."""
from datetime import date

from pydantic import BaseModel, Field, field_validator

from app.schemas.common import UtcDateTime


class ProductStockOut(BaseModel):
    product_stock_id: int
    product_id: int
    current_stock: int
    reserved_stock: int
    reorder_level: int
    maximum_level: int | None
    is_low_stock: bool
    updated_at: UtcDateTime


class StockMovementOut(BaseModel):
    stock_movement_id: int
    product_id: int
    movement_type: str
    quantity: int
    running_balance: int
    source: str
    reference_id: int | None
    created_by: int | None
    created_at: UtcDateTime


class StockAdjustmentCreate(BaseModel):
    product_id: int
    quantity_change: int = Field(description="Positive to increase stock, negative to decrease")
    reason: str = Field(min_length=1, max_length=255)

    @field_validator("reason", mode="before")
    @classmethod
    def strip_spaces(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value

    @field_validator("quantity_change")
    @classmethod
    def not_zero(cls, value: int) -> int:
        if value == 0:
            raise ValueError("quantity_change cannot be 0")
        return value


class StockAdjustmentOut(BaseModel):
    stock_adjustment_id: int
    product_id: int
    quantity_change: int
    reason: str
    balance_after: int
    adjusted_by: int | None
    created_at: UtcDateTime


class StockBatchCreate(BaseModel):
    product_id: int
    batch_number: str = Field(min_length=1, max_length=50)
    quantity: int = Field(gt=0)
    expiry_date: date

    @field_validator("batch_number", mode="before")
    @classmethod
    def strip_spaces(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value


class StockBatchOut(BaseModel):
    stock_batch_id: int
    product_id: int
    batch_number: str
    quantity: int
    expiry_date: date
    is_expired: bool
    received_at: UtcDateTime