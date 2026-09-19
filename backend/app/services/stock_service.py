"""Inventory business logic: stock_in/stock_out (called by other modules), adjustments, expiry.

Important: functions here never call db.commit() - the caller commits once at the end,
so a failed sale or purchase leaves nothing half-saved (see team rule in the module plan).
"""
from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import ProductStock, StockAdjustment, StockBatch, StockMovement
from app.schemas.stock import (
    ProductStockOut,
    StockAdjustmentCreate,
    StockAdjustmentOut,
    StockBatchCreate,
    StockBatchOut,
    StockMovementOut,
)


def _get_or_create_product_stock(db: Session, product_id: int) -> ProductStock:
    stock = db.scalar(select(ProductStock).where(ProductStock.product_id == product_id))
    if stock is None:
        stock = ProductStock(product_id=product_id, current_stock=0, reserved_stock=0, reorder_level=0)
        db.add(stock)
        db.flush()  # so stock.current_stock is usable below before the caller commits
    return stock


def stock_in(db: Session, product_id: int, quantity: int, source: str, reference_id: int | None, user_id: int | None) -> StockMovement:
    """Increases stock. Called by Purchases (Module 3) when a purchase is completed.

    Does not commit - the caller (e.g. complete_purchase) commits once at the end.
    """
    if quantity <= 0:
        raise ValueError("stock_in quantity must be positive")

    stock = _get_or_create_product_stock(db, product_id)
    stock.current_stock += quantity

    movement = StockMovement(
        product_id=product_id,
        movement_type="in",
        quantity=quantity,
        running_balance=stock.current_stock,
        source=source,
        reference_id=reference_id,
        created_by=user_id,
    )
    db.add(movement)
    db.flush()
    return movement


def stock_out(db: Session, product_id: int, quantity: int, source: str, reference_id: int | None, user_id: int | None) -> StockMovement:
    """Decreases stock. Called by Sales (Module 5) when a sale is completed.

    Raises ValueError if there isn't enough stock - the caller should catch this
    and cancel the whole transaction (nothing should be half-saved).
    Does not commit - the caller commits once at the end.
    """
    if quantity <= 0:
        raise ValueError("stock_out quantity must be positive")

    stock = _get_or_create_product_stock(db, product_id)
    if stock.current_stock < quantity:
        raise ValueError(f"Not enough stock for product {product_id}: have {stock.current_stock}, need {quantity}")

    stock.current_stock -= quantity

    movement = StockMovement(
        product_id=product_id,
        movement_type="out",
        quantity=quantity,
        running_balance=stock.current_stock,
        source=source,
        reference_id=reference_id,
        created_by=user_id,
    )
    db.add(movement)
    db.flush()
    return movement


def create_adjustment(db: Session, data: StockAdjustmentCreate, user_id: int | None) -> StockAdjustment:
    """Manual stock correction with a reason. Commits are the router's job, not this function's."""
    stock = _get_or_create_product_stock(db, data.product_id)
    stock.current_stock += data.quantity_change
    if stock.current_stock < 0:
        raise ValueError("Adjustment would make stock negative")

    adjustment = StockAdjustment(
        product_id=data.product_id,
        quantity_change=data.quantity_change,
        reason=data.reason,
        balance_after=stock.current_stock,
        adjusted_by=user_id,
    )
    db.add(adjustment)

    db.add(StockMovement(
        product_id=data.product_id,
        movement_type="in" if data.quantity_change > 0 else "out",
        quantity=abs(data.quantity_change),
        running_balance=stock.current_stock,
        source="adjustment",
        reference_id=None,
        created_by=user_id,
    ))
    db.flush()
    return adjustment


def add_batch(db: Session, data: StockBatchCreate) -> StockBatch:
    batch = StockBatch(**data.model_dump())
    db.add(batch)
    db.flush()
    return batch


def list_low_stock(db: Session) -> list[ProductStock]:
    return list(db.scalars(select(ProductStock).where(ProductStock.current_stock <= ProductStock.reorder_level)))


def list_expiring_batches(db: Session, within_days: int = 7) -> list[StockBatch]:
    from datetime import timedelta
    cutoff = date.today() + timedelta(days=within_days)
    return list(db.scalars(select(StockBatch).where(StockBatch.expiry_date <= cutoff)))


# ---- Converters: model -> API response shape ----

def to_product_stock_out(stock: ProductStock) -> ProductStockOut:
    return ProductStockOut(
        product_stock_id=stock.product_stock_id,
        product_id=stock.product_id,
        current_stock=stock.current_stock,
        reserved_stock=stock.reserved_stock,
        reorder_level=stock.reorder_level,
        maximum_level=stock.maximum_level,
        is_low_stock=stock.current_stock <= stock.reorder_level,
        updated_at=stock.updated_at,
    )


def to_stock_movement_out(movement: StockMovement) -> StockMovementOut:
    return StockMovementOut.model_validate(movement, from_attributes=True)


def to_stock_adjustment_out(adjustment: StockAdjustment) -> StockAdjustmentOut:
    return StockAdjustmentOut.model_validate(adjustment, from_attributes=True)


def to_stock_batch_out(batch: StockBatch) -> StockBatchOut:
    return StockBatchOut(
        stock_batch_id=batch.stock_batch_id,
        product_id=batch.product_id,
        batch_number=batch.batch_number,
        quantity=batch.quantity,
        expiry_date=batch.expiry_date,
        is_expired=batch.expiry_date < date.today(),
        received_at=batch.received_at,
    )