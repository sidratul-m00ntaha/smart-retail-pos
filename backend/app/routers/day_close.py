"""End-of-day closing API (Module 5 extension): the day's figures, and the cash count."""
from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import require_permission
from app.database import get_db
from app.schemas.day_close import DayCloseOut, DayCloseSave
from app.services import day_close_service

router = APIRouter(prefix="/api/day-close", tags=["day-close"])


@router.get("", response_model=DayCloseOut)
def get_day_close(
    business_date: date | None = Query(None, alias="date", description="The store day, e.g. 2026-10-09. Leave out for today."),
    db: Session = Depends(get_db),
    user=Depends(require_permission("sales.view")),
):
    """The day's sales, money received by method, refunds, per-cashier totals and the cash the drawer should hold."""
    return day_close_service.get_day_close(db, business_date)


@router.post("", response_model=DayCloseOut)
def save_day_close(
    payload: DayCloseSave,
    db: Session = Depends(get_db),
    user=Depends(require_permission("sales.view")),
):
    """Saves the cash count for a day. Saving the same day again replaces the earlier count."""
    return day_close_service.save_day_close(db, user.user_id, payload)
