# # from typing import List, Optional

# # from fastapi import APIRouter, Depends
# # from sqlalchemy.orm import Session

# # from app.database import get_db
# # # Swap for `from app.core.dependencies import get_current_user, CurrentUser` once Module 1 lands.
# # from app.schemas.purchase import PurchaseCreate, PurchaseOut
# # from app.services import purchase_service
# # from app.services.purchase_service import _to_out

# # router = APIRouter(prefix="/api/purchases", tags=["Purchases"])


# # @router.get("", response_model=List[PurchaseOut])
# # def list_purchases(search: Optional[str] = None, db: Session = Depends(get_db)):
# #     return purchase_service.list_purchases(db, search)


# # @router.get("/{purchase_id}", response_model=PurchaseOut)
# # def get_purchase(purchase_id: int, db: Session = Depends(get_db)):
# #     return _to_out(purchase_service.get_purchase(db, purchase_id))


# # @router.post("", response_model=PurchaseOut, status_code=201)
# # def create_purchase(
# #     data: PurchaseCreate,
# #     db: Session = Depends(get_db),
# #     user: CurrentUser = Depends(get_current_user),
# # ):
# #     return purchase_service.create_purchase(db, data, user["UserID"])


# #----------------------------------------------------
# """Purchase endpoints: /api/purchases (PRD 5.6)."""
# from fastapi import APIRouter, Depends, Query, status
# from sqlalchemy.orm import Session

# from app.core.dependencies import require_permission
# from app.database import get_db
# from app.models import User
# from app.schemas.purchase import PaymentStatus, PurchaseCreate, PurchaseListOut, PurchaseOut
# from app.services import purchase_service as svc

# router = APIRouter(prefix="/api/purchases", tags=["Purchases"])


# @router.get("", response_model=list[PurchaseListOut])
# def list_purchases(
#     search: str | None = Query(None, max_length=100, description="Text in the purchase number or supplier name"),
#     supplier_id: int | None = None,
#     payment_status: PaymentStatus | None = None,
#     db: Session = Depends(get_db),
#     current_user: User = Depends(require_permission("purchases.manage")),
# ):
#     """Purchase history, newest first."""
#     return svc.list_purchases(db, search, supplier_id, payment_status)


# @router.get("/{purchase_id}", response_model=PurchaseOut)
# def get_purchase(
#     purchase_id: int,
#     db: Session = Depends(get_db),
#     current_user: User = Depends(require_permission("purchases.manage")),
# ):
#     """One purchase with all its lines."""
#     return svc.get_purchase_out(db, purchase_id)


# @router.post("", response_model=PurchaseOut, status_code=status.HTTP_201_CREATED)
# def create_purchase(
#     data: PurchaseCreate,
#     db: Session = Depends(get_db),
#     current_user: User = Depends(require_permission("purchases.manage")),
# ):
#     """Confirms a purchase in one all-or-nothing step (PRD 5.6).

#     The browser sends the supplier, the lines and what was paid. Totals, VAT and the due are worked out
#     by the server. Stock goes up, a stock movement is written, and the activity log records it.
#     """
#     purchase = svc.create_purchase(db, data, current_user)
#     db.commit()  # the one and only commit: the purchase, its stock-in and its log entry are saved together
#     return svc.get_purchase_out(db, purchase.purchase_id)

"""Purchase endpoints: /api/purchases (PRD 5.6)."""
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.dependencies import require_permission
from app.database import get_db
from app.models import User
from app.schemas.purchase import PaymentStatus, PurchaseCreate, PurchaseListOut, PurchaseOut
from app.services import purchase_service as svc

router = APIRouter(prefix="/api/purchases", tags=["Purchases"])


@router.get("", response_model=list[PurchaseListOut])
def list_purchases(
    search: str | None = Query(None, max_length=100, description="Text in the purchase number or supplier name"),
    supplier_id: int | None = None,
    payment_status: PaymentStatus | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("purchases.manage")),
):
    """Purchase history, newest first."""
    return svc.list_purchases(db, search, supplier_id, payment_status)


@router.get("/{purchase_id}", response_model=PurchaseOut)
def get_purchase(
    purchase_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("purchases.manage")),
):
    """One purchase with all its lines."""
    return svc.get_purchase_out(db, purchase_id)


@router.post("", response_model=PurchaseOut, status_code=status.HTTP_201_CREATED)
def create_purchase(
    data: PurchaseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("purchases.manage")),
):
    """Confirms a purchase in one all-or-nothing step (PRD 5.6).

    The browser sends the supplier, the lines and what was paid. Totals, VAT and the due are worked out
    by the server. Stock goes up, a stock movement is written, and the activity log records it.
    """
    purchase = svc.create_purchase(db, data, current_user)
    db.commit()  # the one and only commit: the purchase, its stock-in and its log entry are saved together
    return svc.get_purchase_out(db, purchase.purchase_id)