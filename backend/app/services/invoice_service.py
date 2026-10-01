"""Invoices (PRD 5.17): the invoice number, the invoice document, and the sales / invoices list.

Only make_invoice_number() and to_sale_out() are used while a sale is being completed (by sale_service). The
rest is read-only: it never changes data and never commits.

The saved Sale rows are never edited (the invoice is a snapshot of the moment of sale). The sales / invoices LIST
shows each sale's CURRENT paid / due / status instead: see live_dues().
"""
from datetime import datetime, timezone
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models import User
from app.models.customer import Customer, CustomerPayment
from app.models.sale import Invoice, Payment, Sale, SaleItem
from app.models.sale_return import SaleReturn
from app.schemas.sale import PaymentOut, SaleItemOut, SaleListItem, SaleListPage, SaleListTotals, SaleOut
from app.services.store_setting_service import get_store_settings


def make_invoice_number(db: Session, sale_id: int) -> str:
    """e.g. INV-2026-00125. The prefix is the store's "invoice prefix" setting (Module 1). The number comes from the
    sale's id, which the database hands out one at a time, so two cashiers can never get the same invoice number."""
    prefix = get_store_settings(db).invoice_prefix
    return f"{prefix}-{datetime.now(timezone.utc).year}-{sale_id:05d}"


def to_sale_out(db: Session, sale: Sale, invoice_number: str, items: list[SaleItem], payments: list[Payment]) -> SaleOut:
    """The sale as an invoice document: its own amounts plus the store, cashier and customer details for the header."""
    store = get_store_settings(db)
    cashier = db.get(User, sale.cashier_id)
    customer = db.get(Customer, sale.customer_id) if sale.customer_id is not None else None
    return SaleOut(
        sale_id=sale.sale_id,
        invoice_number=invoice_number,
        store_name=store.store_name,
        store_address=store.address,
        store_phone=store.phone,
        cashier_name=cashier.full_name if cashier is not None else None,
        customer_name=customer.name if customer is not None else None,
        customer_phone=customer.phone if customer is not None else None,
        customer_id=sale.customer_id,
        cashier_id=sale.cashier_id,
        subtotal=sale.subtotal,
        discount_percent=sale.discount_percent,
        discount_amount=sale.discount_amount,
        tax_amount=sale.tax_amount,
        total_amount=sale.total_amount,
        paid_amount=sale.paid_amount,
        due_amount=sale.due_amount,
        payment_status=sale.payment_status,
        status=sale.status,
        created_at=sale.created_at,
        items=[SaleItemOut.model_validate(item) for item in items],
        payments=[PaymentOut.model_validate(payment) for payment in payments],
    )


def get_sale(db: Session, sale_id: int) -> SaleOut:
    return _load(db, db.get(Sale, sale_id), "Sale not found.")


def get_invoice(db: Session, invoice_number: str) -> SaleOut:
    sale = db.scalar(select(Sale).join(Invoice, Invoice.sale_id == Sale.sale_id).where(Invoice.invoice_number == invoice_number))
    return _load(db, sale, "Invoice not found.")


def _load(db: Session, sale: Sale | None, not_found: str) -> SaleOut:
    if sale is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, not_found)
    invoice = db.scalar(select(Invoice).where(Invoice.sale_id == sale.sale_id))
    if invoice is None:  # every completed sale has exactly one invoice (PRD 5.17); this would be a broken record
        raise HTTPException(status.HTTP_404_NOT_FOUND, not_found)
    items = list(db.scalars(select(SaleItem).where(SaleItem.sale_id == sale.sale_id).order_by(SaleItem.sale_item_id)))
    payments = list(db.scalars(select(Payment).where(Payment.sale_id == sale.sale_id).order_by(Payment.payment_id)))
    return to_sale_out(db, sale, invoice.invoice_number, items, payments)


def apply_credit(dues: list[tuple[int, Decimal]], credit: Decimal) -> dict[int, Decimal]:
    """Spreads money already received over a customer's sales, oldest first.
    `dues` is (sale_id, saved due) in oldest-first order. Returns sale_id -> due that is left."""
    left: dict[int, Decimal] = {}
    for sale_id, due in dues:
        applied = min(due, credit)
        credit -= applied
        left[sale_id] = due - applied
    return left


def live_dues(db: Session) -> dict[int, Decimal]:
    """The due each credit sale has NOW. The saved Sale rows are never edited (the invoice is a snapshot),
    so later due payments (Module 6) and the due cleared by returns are applied here, oldest sale first.
    Read-only. Only sales that were saved with a due are in the result."""
    credit_sales = db.execute(
        select(Sale.sale_id, Sale.customer_id, Sale.due_amount)
        .where(Sale.customer_id.is_not(None), Sale.due_amount > 0)
        .order_by(Sale.customer_id, Sale.created_at, Sale.sale_id)
    ).all()
    if not credit_sales:
        return {}

    received = {
        cid: Decimal(str(total))
        for cid, total in db.execute(
            select(CustomerPayment.customer_id, func.sum(CustomerPayment.amount)).group_by(CustomerPayment.customer_id)
        )
    }
    cleared_by_returns = {
        cid: Decimal(str(total))
        for cid, total in db.execute(
            select(Sale.customer_id, func.sum(SaleReturn.due_reduced))
            .select_from(SaleReturn)
            .join(Sale, Sale.sale_id == SaleReturn.sale_id)
            .where(Sale.customer_id.is_not(None))
            .group_by(Sale.customer_id)
        )
    }

    by_customer: dict[int, list[tuple[int, Decimal]]] = {}
    for sale_id, customer_id, due in credit_sales:
        by_customer.setdefault(customer_id, []).append((sale_id, due))

    live: dict[int, Decimal] = {}
    for customer_id, dues in by_customer.items():
        credit = received.get(customer_id, Decimal("0")) + cleared_by_returns.get(customer_id, Decimal("0"))
        live.update(apply_credit(dues, credit))
    return live


def list_sales(
    db: Session,
    *,
    created_from: datetime | None = None,
    created_before: datetime | None = None,
    payment_status: str | None = None,
    customer_id: int | None = None,
    search: str | None = None,
    page: int = 1,
    page_size: int = 25,
) -> SaleListPage:
    """One page of sales matching the filters, newest first, with the sums over every match.
    Paid, due and payment status are the CURRENT ones (see live_dues), so the filter and the sums use them too.
    All matching sales are loaded and paged in Python, because the live status can't be filtered in plain SQL."""
    if created_from and created_before and _as_utc(created_from) >= _as_utc(created_before):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "The start date must be before the end date.")

    conditions = []
    if customer_id is not None:
        conditions.append(Sale.customer_id == customer_id)
    if created_from:
        conditions.append(Sale.created_at >= _as_utc(created_from))
    if created_before:
        conditions.append(Sale.created_at < _as_utc(created_before))
    if search and search.strip():
        term = search.strip()
        # autoescape: a % or _ typed by the user is searched for as it is
        conditions.append(
            or_(
                Invoice.invoice_number.contains(term, autoescape=True),
                Customer.name.contains(term, autoescape=True),
                Customer.phone.contains(term, autoescape=True),
            )
        )

    units = select(func.coalesce(func.sum(SaleItem.quantity), 0)).where(SaleItem.sale_id == Sale.sale_id).correlate(Sale).scalar_subquery()
    rows = db.execute(
        select(Sale, Invoice.invoice_number, Customer.name, Customer.phone, User.full_name, units)
        .select_from(Sale)
        .join(Invoice, Invoice.sale_id == Sale.sale_id)
        .outerjoin(Customer, Customer.customer_id == Sale.customer_id)
        .outerjoin(User, User.user_id == Sale.cashier_id)
        .where(*conditions)
        .order_by(Sale.created_at.desc(), Sale.sale_id.desc())
    ).all()

    live = live_dues(db)
    matches: list[SaleListItem] = []
    for sale, invoice_number, customer_name, customer_phone, cashier_name, units_sold in rows:
        due = live.get(sale.sale_id, sale.due_amount)
        paid = sale.paid_amount + (sale.due_amount - due)
        status_now = sale.payment_status
        if sale.sale_id in live:  # a credit sale: its status follows what is still owed
            status_now = "PAID" if due == 0 else ("DUE" if paid == 0 else "PARTIALLY_PAID")
        if payment_status and status_now != payment_status:
            continue
        matches.append(
            SaleListItem(
                sale_id=sale.sale_id,
                invoice_number=invoice_number,
                created_at=sale.created_at,
                customer_id=sale.customer_id,
                customer_name=customer_name,
                customer_phone=customer_phone,
                cashier_name=cashier_name,
                item_count=Decimal(units_sold),
                total_amount=sale.total_amount,
                paid_amount=paid,
                due_amount=due,
                payment_status=status_now,
                status=sale.status,
            )
        )

    start = (page - 1) * page_size
    return SaleListPage(
        items=matches[start : start + page_size],
        total=len(matches),
        page=page,
        page_size=page_size,
        totals=SaleListTotals(
            transactions=len(matches),
            total_amount=sum((m.total_amount for m in matches), Decimal("0")),
            paid_amount=sum((m.paid_amount for m in matches), Decimal("0")),
            due_amount=sum((m.due_amount for m in matches), Decimal("0")),
        ),
    )


def _as_utc(value: datetime) -> datetime:
    """The database stores UTC without a time zone, so times sent with a zone are converted first."""
    if value.tzinfo is None:
        return value  # already UTC
    return value.astimezone(timezone.utc).replace(tzinfo=None)
