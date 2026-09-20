from typing import List, Optional

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_permission
from app.database import get_db
from app.models import User
from app.schemas.catalog import UnitCreate, UnitOut, UnitUpdate
from app.services import catalog_service as svc

router = APIRouter(prefix="/api/units", tags=["Units"])


@router.get("", response_model=List[UnitOut])
def get_units(
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return svc.list_units(db, status_filter)


@router.post("", response_model=UnitOut, status_code=status.HTTP_201_CREATED)
def create_unit(
    payload: UnitCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("products.manage")),
):
    obj = svc.create_unit(db, payload, current_user)
    db.commit()
    db.refresh(obj)
    return obj


@router.put("/{unit_id}", response_model=UnitOut)
def update_unit(
    unit_id: int,
    payload: UnitUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("products.manage")),
):
    obj = svc.update_unit(db, unit_id, payload, current_user)
    db.commit()
    db.refresh(obj)
    return obj
