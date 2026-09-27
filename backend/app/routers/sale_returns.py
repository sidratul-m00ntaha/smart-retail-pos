"""Returns API (Module 5): cancelling an item after the invoice."""
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.dependencies import require_permission
from app.database import get_db
from app.schemas.sale_return import SaleReturnCreate, SaleReturnOut
from app.services import sale_return_service

router = APIRouter(prefix="/api/sales", tags=["sales"])


@router.post("/{sale_id}/returns", response_model=SaleReturnOut, status_code=status.HTTP_201_CREATED)
def create_return(
    sale_id: int,
    payload: SaleReturnCreate,
    db: Session = Depends(get_db),
    user=Depends(require_permission("sales.return")),
):
    """Returns some or all of a sale's items: restocks them, refunds or reduces the customer's due, and
    reverses the loyalty points they earned. The original invoice is never changed."""
    return sale_return_service.create_return(db, sale_id, payload, user_id=user.user_id)
