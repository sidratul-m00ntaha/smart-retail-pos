"""Invoices API (Module 5, PRD 5.17): every completed sale has exactly one invoice."""
from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import require_permission
from app.database import get_db
from app.schemas.sale import SaleListPage, SaleOut
from app.services import invoice_service

router = APIRouter(prefix="/api/invoices", tags=["invoices"])


@router.get("", response_model=SaleListPage)
def list_invoices(
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
    """The invoices, newest first, one page at a time. (Same rows as the sales list: one invoice per sale.)"""
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


@router.get("/{invoice_number}", response_model=SaleOut)
def get_invoice(
    invoice_number: str,
    db: Session = Depends(get_db),
    user=Depends(require_permission("sales.view")),
):
    """The invoice to view or print, looked up by its number, e.g. INV-2026-00125."""
    return invoice_service.get_invoice(db, invoice_number)
