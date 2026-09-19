"""Dashboard + report endpoints (PRD 5.19, 5.20).

Returns stand-in data for anything owned by another module - see the
comment at the top of services/report_service.py.
"""
from typing import Literal

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import require_permission
from app.database import get_db
from app.models import User
from app.services import report_service as svc

router = APIRouter(prefix="/api/reports", tags=["Reports"])


@router.get("/dashboard")
def dashboard(db: Session = Depends(get_db), current_user: User = Depends(require_permission("reports.view"))):
    return svc.get_dashboard_data(db)


@router.get("/sales")
def sales_report(
    date_range: Literal["today", "yesterday", "week", "month", "custom"] = "today",
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("reports.view")),
):
    return svc.get_sales_report(db, date_range)


@router.get("/purchases")
def purchase_report(db: Session = Depends(get_db), current_user: User = Depends(require_permission("reports.view"))):
    return svc.get_purchase_report(db)


@router.get("/inventory")
def inventory_report(db: Session = Depends(get_db), current_user: User = Depends(require_permission("reports.view"))):
    return svc.get_inventory_report(db)


@router.get("/expiry")
def expiry_report(db: Session = Depends(get_db), current_user: User = Depends(require_permission("reports.view"))):
    return svc.get_expiry_report(db)


@router.get("/customers")
def customer_report(db: Session = Depends(get_db), current_user: User = Depends(require_permission("reports.view"))):
    return svc.get_customer_report(db)
