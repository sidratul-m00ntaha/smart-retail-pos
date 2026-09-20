"""Stock movement history (read-only ledger): /api/stock/movements (PRD 5.8)."""
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.dependencies import require_permission
from app.database import get_db
from app.models import StockMovement, User
from app.schemas.stock import StockMovementOut
from app.services import stock_service

router = APIRouter(prefix="/api/stock/movements", tags=["Inventory"])


@router.get("", response_model=list[StockMovementOut])
def list_movements(
    product_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("inventory.manage")),
):
    """Full in/out history, newest first. Filter by product_id if given."""
    query = select(StockMovement).order_by(StockMovement.created_at.desc())
    if product_id is not None:
        query = query.where(StockMovement.product_id == product_id)
    return [stock_service.to_stock_movement_out(row) for row in db.scalars(query)]