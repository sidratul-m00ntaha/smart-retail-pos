from typing import List, Optional

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_permission
from app.database import get_db
from app.models import User
from app.schemas.catalog import TaxRateCreate, TaxRateOut, TaxRateUpdate
from app.services import catalog_service as svc

router = APIRouter(prefix="/api/tax-rates", tags=["Tax Rates"])


@router.get("", response_model=List[TaxRateOut])
def get_tax_rates(
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return svc.list_tax_rates(db, status_filter)


@router.post("", response_model=TaxRateOut, status_code=status.HTTP_201_CREATED)
def create_tax_rate(
    payload: TaxRateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("tax_rates.manage")),
):
    obj = svc.create_tax_rate(db, payload, current_user)
    db.commit()
    db.refresh(obj)
    return obj


@router.put("/{tax_rate_id}", response_model=TaxRateOut)
def update_tax_rate(
    tax_rate_id: int,
    payload: TaxRateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("tax_rates.manage")),
):
    obj = svc.update_tax_rate(db, tax_rate_id, payload, current_user)
    db.commit()
    db.refresh(obj)
    return obj
