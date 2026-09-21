"""Sales API (Module 5): complete a sale from the POS, and look sales up afterwards."""
from datetime import datetime
from typing import Literal

from fastapi import APIRouter, BackgroundTasks, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.dependencies import require_permission
from app.database import get_db
from app.schemas.sale import SaleCreate, SaleListPage, SaleOut
from app.services import invoice_service
from app.services.notification_service import notify_sale_completed
from app.services.sale_service import complete_sale

router = APIRouter(prefix="/api/sales", tags=["sales"])


@router.post("", response_model=SaleOut, status_code=status.HTTP_201_CREATED)
def create_sale(
    payload: SaleCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user=Depends(require_permission("pos.sell")),
):
    """Completes a sale in one all-or-nothing transaction (PRD 5.14).

    The browser sends only product ids, quantities, the customer and the payments.
    Prices, VAT, discount, stock, due and points are all worked out by the server.
    """
    completed = complete_sale(db, payload, cashier_id=user.user_id)
    # The sale is already committed, so a failing SMS can never undo or block it.
    background_tasks.add_task(
        notify_sale_completed, completed.customer_phone, completed.sale.invoice_number, completed.sale.total_amount
    )
    return completed.sale


@router.get("", response_model=SaleListPage)
def list_sales(
    created_from: datetime | None = Query(None, description="From this time (included), e.g. 2026-09-17T00:00:00+06:00"),
    created_before: datetime | None = Query(None, description="Before this time (not included)"),
    payment_status: Literal["PAID", "PARTIALLY_PAID", "DUE"] | None = None,
    customer_id: int | None = None,
    search: str | None = Query(None, max_length=100, description="Text in the invoice number, or the customer's name or phone"),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    db: Session = Depends(get_db),
    user=Depends(require_permission("sales.view")),
):
    """Sales matching the filters, newest first, one page at a time, with the sums over every match."""
    return invoice_service.list_sales(
        db,
        created_from=created_from,
        created_before=created_before,
        payment_status=payment_status,
        customer_id=customer_id,
        search=search,
        page=page,
        page_size=page_size,
    )


@router.get("/{sale_id}", response_model=SaleOut)
def get_sale(
    sale_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_permission("sales.view")),
):
    """One sale with its lines and payments, shaped as an invoice."""
    return invoice_service.get_sale(db, sale_id)
