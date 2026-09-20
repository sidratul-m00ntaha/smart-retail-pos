"""Expiry batches and alerts: /api/expiry (PRD 5.10)."""
from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.dependencies import require_permission
from app.database import get_db
from app.models import StockBatch, User
from app.schemas.stock import StockBatchCreate, StockBatchOut
from app.services import stock_service

router = APIRouter(prefix="/api/expiry", tags=["Inventory"])


@router.get("/batches", response_model=list[StockBatchOut])
def list_batches(db: Session = Depends(get_db), current_user: User = Depends(require_permission("inventory.manage"))):
    return [stock_service.to_stock_batch_out(row) for row in db.scalars(select(StockBatch))]


@router.get("/alerts", response_model=list[StockBatchOut])
def list_expiring_soon(
    days: int = 7,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("reports.view")),
):
    """Batches expiring within the given number of days (default 7)."""
    return [stock_service.to_stock_batch_out(row) for row in stock_service.list_expiring_batches(db, days)]


@router.post("/batches", response_model=StockBatchOut, status_code=status.HTTP_201_CREATED)
def add_batch(
    data: StockBatchCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("inventory.manage")),
):
    batch = stock_service.add_batch(db, data, user_id=current_user.user_id)
    db.commit()
    return stock_service.to_stock_batch_out(batch)