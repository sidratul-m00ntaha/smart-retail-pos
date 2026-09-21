# # from typing import List, Optional

# # from fastapi import APIRouter, Depends, Query
# # from sqlalchemy.orm import Session

# # from app.database import get_db
# # # Swap for `from app.core.dependencies import get_current_user, CurrentUser` once Module 1 lands.
# # from app.schemas.supplier import SupplierCreate, SupplierOut, SupplierPaymentCreate, SupplierPaymentOut, SupplierUpdate
# # from app.services import supplier_service

# # router = APIRouter(prefix="/api/suppliers", tags=["Suppliers"])


# # @router.get("/payments", response_model=List[SupplierPaymentOut])
# # def list_payments(search: Optional[str] = None, db: Session = Depends(get_db)):
# #     return supplier_service.list_payments(db, search)


# # @router.get("", response_model=List[SupplierOut])
# # def list_suppliers(
# #     search: Optional[str] = None,
# #     status: Optional[str] = Query(None, description="All | Active | Inactive"),
# #     db: Session = Depends(get_db),
# # ):
# #     return supplier_service.list_suppliers(db, search, status)


# # @router.post("", response_model=SupplierOut, status_code=201)
# # def create_supplier(data: SupplierCreate, db: Session = Depends(get_db)):
# #     return supplier_service.create_supplier(db, data)


# # @router.put("/{supplier_id}", response_model=SupplierOut)
# # def update_supplier(supplier_id: int, data: SupplierUpdate, db: Session = Depends(get_db)):
# #     return supplier_service.update_supplier(db, supplier_id, data)


# # @router.post("/{supplier_id}/pay", response_model=SupplierOut)
# # def pay_supplier(
# #     supplier_id: int,
# #     data: SupplierPaymentCreate,
# #     db: Session = Depends(get_db),
# #     user: CurrentUser = Depends(get_current_user),
# # ):
# #     return supplier_service.pay_supplier(db, supplier_id, data, user["UserID"])

# #----------------------------------------------------


# """Supplier endpoints: /api/suppliers (PRD 5.5)."""
# from fastapi import APIRouter, Depends, Query, status
# from sqlalchemy.orm import Session

# from app.core.dependencies import require_permission
# from app.database import get_db
# from app.models import User
# from app.schemas.supplier import SupplierCreate, SupplierOut, SupplierStatus, SupplierUpdate
# from app.services import supplier_service as svc

# router = APIRouter(prefix="/api/suppliers", tags=["Suppliers"])


# @router.get("", response_model=list[SupplierOut])
# def list_suppliers(
#     search: str | None = Query(None, max_length=100, description="Text in the name, phone or email"),
#     status_filter: SupplierStatus | None = None,
#     db: Session = Depends(get_db),
#     current_user: User = Depends(require_permission("suppliers.manage")),
# ):
#     """Suppliers with their total purchases, total paid and outstanding due, sorted by name."""
#     return svc.list_suppliers(db, search, status_filter)


# @router.get("/{supplier_id}", response_model=SupplierOut)
# def get_supplier(
#     supplier_id: int,
#     db: Session = Depends(get_db),
#     current_user: User = Depends(require_permission("suppliers.manage")),
# ):
#     return svc.get_supplier_out(db, supplier_id)


# @router.post("", response_model=SupplierOut, status_code=status.HTTP_201_CREATED)
# def create_supplier(
#     data: SupplierCreate,
#     db: Session = Depends(get_db),
#     current_user: User = Depends(require_permission("suppliers.manage")),
# ):
#     supplier = svc.create_supplier(db, data, current_user)
#     db.commit()
#     return svc.get_supplier_out(db, supplier.supplier_id)


# @router.put("/{supplier_id}", response_model=SupplierOut)
# def update_supplier(
#     supplier_id: int,
#     data: SupplierUpdate,
#     db: Session = Depends(get_db),
#     current_user: User = Depends(require_permission("suppliers.manage")),
# ):
#     """Edit a supplier, or activate / deactivate it with `status`."""
#     svc.update_supplier(db, supplier_id, data, current_user)
#     db.commit()
#     return svc.get_supplier_out(db, supplier_id)




"""Supplier endpoints: /api/suppliers (PRD 5.5)."""
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.dependencies import require_permission
from app.database import get_db
from app.models import User
from app.schemas.supplier import SupplierCreate, SupplierOut, SupplierStatus, SupplierUpdate
from app.services import supplier_service as svc

router = APIRouter(prefix="/api/suppliers", tags=["Suppliers"])


@router.get("", response_model=list[SupplierOut])
def list_suppliers(
    search: str | None = Query(None, max_length=100, description="Text in the name, phone or email"),
    status_filter: SupplierStatus | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("suppliers.manage")),
):
    """Suppliers with their total purchases, total paid and outstanding due, sorted by name."""
    return svc.list_suppliers(db, search, status_filter)


@router.get("/{supplier_id}", response_model=SupplierOut)
def get_supplier(
    supplier_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("suppliers.manage")),
):
    return svc.get_supplier_out(db, supplier_id)


@router.post("", response_model=SupplierOut, status_code=status.HTTP_201_CREATED)
def create_supplier(
    data: SupplierCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("suppliers.manage")),
):
    supplier = svc.create_supplier(db, data, current_user)
    db.commit()
    return svc.get_supplier_out(db, supplier.supplier_id)


@router.put("/{supplier_id}", response_model=SupplierOut)
def update_supplier(
    supplier_id: int,
    data: SupplierUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("suppliers.manage")),
):
    """Edit a supplier, or activate / deactivate it with `status`."""
    svc.update_supplier(db, supplier_id, data, current_user)
    db.commit()
    return svc.get_supplier_out(db, supplier_id)