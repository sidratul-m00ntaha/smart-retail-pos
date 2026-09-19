from typing import List, Optional

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_permission
from app.database import get_db
from app.models import User
from app.schemas.catalog import CategoryCreate, CategoryOut, CategoryUpdate
from app.services import catalog_service as svc

router = APIRouter(prefix="/api/categories", tags=["Categories"])


@router.get("", response_model=List[CategoryOut])
def get_categories(
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return svc.list_categories(db, status_filter)


@router.post("", response_model=CategoryOut, status_code=status.HTTP_201_CREATED)
def create_category(
    payload: CategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("products.manage")),
):
    obj = svc.create_category(db, payload, current_user)
    db.commit()
    db.refresh(obj)
    return obj


@router.put("/{category_id}", response_model=CategoryOut)
def update_category(
    category_id: int,
    payload: CategoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("products.manage")),
):
    obj = svc.update_category(db, category_id, payload, current_user)
    db.commit()
    db.refresh(obj)
    return obj
