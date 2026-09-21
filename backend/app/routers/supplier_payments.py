# """Supplier payment endpoints: /api/supplier-payments (PRD 5.7, section 8)."""
# from fastapi import APIRouter, Depends, Query, status
# from sqlalchemy.orm import Session

# from app.core.dependencies import require_permission
# from app.database import get_db
# from app.models import User
# from app.schemas.supplier_payment import SupplierPaymentCreate, SupplierPaymentOut
# from app.services import supplier_payment_service as svc

# router = APIRouter(prefix="/api/supplier-payments", tags=["Supplier Payments"])


# @router.get("", response_model=list[SupplierPaymentOut])
# def list_supplier_payments(
#     search: str | None = Query(None, max_length=100, description="Text in the supplier name or purchase number"),
#     supplier_id: int | None = None,
#     db: Session = Depends(get_db),
#     current_user: User = Depends(require_permission("purchases.manage")),
# ):
#     """Payment history, newest first."""
#     return svc.list_payments(db, search, supplier_id)


# @router.post("", response_model=SupplierPaymentOut, status_code=status.HTTP_201_CREATED)
# def create_supplier_payment(
#     data: SupplierPaymentCreate,
#     db: Session = Depends(get_db),
#     current_user: User = Depends(require_permission("purchases.manage")),
# ):
#     """Pays a supplier. The supplier's outstanding due goes down by exactly the amount."""
#     payment = svc.create_payment(db, data, current_user)
#     db.commit()
#     return svc.get_payment_out(db, payment.supplier_payment_id)



"""Supplier payment endpoints: /api/supplier-payments (PRD 5.7, section 8)."""
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.dependencies import require_permission
from app.database import get_db
from app.models import User
from app.schemas.supplier_payment import SupplierPaymentCreate, SupplierPaymentOut
from app.services import supplier_payment_service as svc

router = APIRouter(prefix="/api/supplier-payments", tags=["Supplier Payments"])


@router.get("", response_model=list[SupplierPaymentOut])
def list_supplier_payments(
    search: str | None = Query(None, max_length=100, description="Text in the supplier name or purchase number"),
    supplier_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("purchases.manage")),
):
    """Payment history, newest first."""
    return svc.list_payments(db, search, supplier_id)


@router.post("", response_model=SupplierPaymentOut, status_code=status.HTTP_201_CREATED)
def create_supplier_payment(
    data: SupplierPaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("purchases.manage")),
):
    """Pays a supplier. The supplier's outstanding due goes down by exactly the amount."""
    payment = svc.create_payment(db, data, current_user)
    db.commit()
    return svc.get_payment_out(db, payment.supplier_payment_id)