from typing import List, Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
# Swap for `from app.core.dependencies import get_current_user, CurrentUser` once Module 1 lands.
from app.core.temp_auth_stub import CurrentUser, get_current_user
from app.schemas.purchase import PurchaseCreate, PurchaseOut
from app.services import purchase_service
from app.services.purchase_service import _to_out

router = APIRouter(prefix="/api/purchases", tags=["Purchases"])


@router.get("", response_model=List[PurchaseOut])
def list_purchases(search: Optional[str] = None, db: Session = Depends(get_db)):
    return purchase_service.list_purchases(db, search)


@router.get("/{purchase_id}", response_model=PurchaseOut)
def get_purchase(purchase_id: int, db: Session = Depends(get_db)):
    return _to_out(purchase_service.get_purchase(db, purchase_id))


@router.post("", response_model=PurchaseOut, status_code=201)
def create_purchase(
    data: PurchaseCreate,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    return purchase_service.create_purchase(db, data, user["UserID"])
