"""Manual stock corrections: /api/stock/adjustments (PRD 5.8)."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.dependencies import require_permission
from app.database import get_db
from app.models import StockAdjustment, User
from app.schemas.stock import StockAdjustmentCreate, StockAdjustmentOut
from app.services import stock_service

router = APIRouter(prefix="/api/stock/adjustments", tags=["Inventory"])


@router.get("", response_model=list[StockAdjustmentOut])
def list_adjustments(db: Session = Depends(get_db), current_user: User = Depends(require_permission("inventory.manage"))):
    rows = db.scalars(select(StockAdjustment).order_by(StockAdjustment.created_at.desc()))
    return [stock_service.to_stock_adjustment_out(row) for row in rows]


@router.post("", response_model=StockAdjustmentOut, status_code=status.HTTP_201_CREATED)
def create_adjustment(
    data: StockAdjustmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("inventory.manage")),
):
    """Manually increase or decrease stock, with a reason. Also writes a StockMovement entry."""
    try:
        adjustment = stock_service.create_adjustment(db, data, current_user.user_id)
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)) from error
    db.commit()
    return stock_service.to_stock_adjustment_out(adjustment)