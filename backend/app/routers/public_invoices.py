"""The public invoice page (Module 5): what opens when a customer scans the QR code on an invoice.

No login is needed, so the address contains a signed code (see services/invoice_link.py). Only that one invoice can
be read, and the answer leaves out the cashier, the customer's phone number and the database ids.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.sale import PublicInvoiceOut
from app.services import invoice_service

router = APIRouter(prefix="/api/public", tags=["public"])


@router.get("/invoices/{code}", response_model=PublicInvoiceOut)
def get_public_invoice(code: str, db: Session = Depends(get_db)):
    """The invoice behind a QR code. A wrong or changed code answers 404, like an invoice that doesn't exist."""
    return invoice_service.get_public_invoice(db, code)
