from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_permission
from app.database import get_db
from app.models import User
from app.schemas.product import ProductCreate, ProductLookupOut, ProductOut, ProductStats, ProductUpdate
from app.services import product_service as svc

router = APIRouter(prefix="/api/products", tags=["Products"])


@router.get("", response_model=List[ProductOut])
def get_products(
    search: Optional[str] = None,
    category_id: Optional[int] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return svc.list_products(db, search, category_id, status_filter)


@router.get("/stats", response_model=ProductStats)
def get_product_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return svc.get_stats(db)

@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("products.manage")),
):
    svc.delete_product(db, product_id, current_user)
    db.commit()
@router.get("/lookup", response_model=ProductLookupOut)
def lookup_product(code: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Used by Module 5 (POS) and Module 3 (Purchasing) to resolve a scanned
    barcode or typed SKU. Returns 404 rather than an empty list so the
    caller can distinguish "not found" from a network error (PRD 5.9)."""
    product = svc.find_for_sale(db, code)
    if not product:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No active product matches that code")
    return product


@router.get("/{product_id}", response_model=ProductOut)
def get_product(product_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return svc.get_product(db, product_id)


@router.post("", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
def create_product(
    payload: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("products.manage")),
):
    obj = svc.create_product(db, payload, current_user)
    db.commit()
    return svc.get_product(db, obj.product_id)


@router.put("/{product_id}", response_model=ProductOut)
def update_product(
    product_id: int,
    payload: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("products.manage")),
):
    obj = svc.update_product(db, product_id, payload, current_user)
    db.commit()
    return svc.get_product(db, product_id)


@router.patch("/{product_id}/status", response_model=ProductOut)
def toggle_status(
    product_id: int,
    active: bool,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("products.manage")),
):
    svc.set_status(db, product_id, active, current_user)
    db.commit()
    return svc.get_product(db, product_id)
