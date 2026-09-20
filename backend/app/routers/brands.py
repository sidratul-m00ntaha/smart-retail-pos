from typing import List, Optional

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_permission
from app.database import get_db
from app.models import User
from app.schemas.catalog import BrandCreate, BrandOut, BrandUpdate
from app.services import catalog_service as svc

router = APIRouter(prefix="/api/brands", tags=["Brands"])


@router.get("", response_model=List[BrandOut])
def get_brands(
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return svc.list_brands(db, status_filter)


@router.post("", response_model=BrandOut, status_code=status.HTTP_201_CREATED)
def create_brand(
    payload: BrandCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("products.manage")),
):
    obj = svc.create_brand(db, payload, current_user)
    db.commit()
    db.refresh(obj)
    return obj


@router.put("/{brand_id}", response_model=BrandOut)
def update_brand(
    brand_id: int,
    payload: BrandUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("products.manage")),
):
    obj = svc.update_brand(db, brand_id, payload, current_user)
    db.commit()
    db.refresh(obj)
    return obj
