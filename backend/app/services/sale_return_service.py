"""Cancelling an item after the invoice (PRD says nothing about returns; this is a team extension - see
docs/database/module-5-sales.md).

The original Sale, SaleItems, Payments and Invoice are never edited - only Sale.status changes. A return is a
separate credit note: SaleReturns / SaleReturnItems, with its own "invoice number" (a return receipt), and its
own single commit.

ASSUMPTION (flagged for the team, like the points rate was): loyalty points earned on the sale are reversed in
the same proportion as the refund, using the same 1-point-per-100 rule sale_service uses to earn them.
"""
from dataclasses import dataclass
from datetime import datetime, timezone
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import User
from app.models.customer import Customer, LoyaltyTransaction
from app.models.sale import Invoice, Sale, SaleItem
from app.models.sale_return import SaleReturn, SaleReturnItem
from app.schemas.sale_return import SaleReturnCreate, SaleReturnItemOut, SaleReturnOut
from app.services.activity_log_service import log_activity
from app.services.sale_calculator import money
from app.services.sale_service import points_earned
from app.services.stock_service import stock_in


@dataclass(frozen=True)
class _Line:
    item: SaleItem
    quantity: Decimal
    refund: Decimal
    restock: bool


def already_returned(db: Session, sale_item_id: int) -> Decimal:
    """How much of a line has already been returned (across every earlier return on the sale)."""
    return db.scalar(select(func.coalesce(func.sum(SaleReturnItem.quantity), 0)).where(SaleReturnItem.sale_item_id == sale_item_id))


def create_return(db: Session, sale_id: int, data: SaleReturnCreate, user_id: int) -> SaleReturnOut:
    try:
        result = _build_and_save_return(db, sale_id, data, user_id)
        db.commit()  # the one and only commit
    except Exception:
        db.rollback()
        raise
    return result


def _build_and_save_return(db: Session, sale_id: int, data: SaleReturnCreate, user_id: int) -> SaleReturnOut:
    sale = db.get(Sale, sale_id)
    if sale is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Sale not found.")
    if sale.status == "returned":
        raise HTTPException(status.HTTP_409_CONFLICT, "This sale has already been fully returned.")

    # 1. Check every requested line against the original sale and what has already been returned, and price it.
    all_items = list(db.scalars(select(SaleItem).where(SaleItem.sale_id == sale_id)))
    items_by_id = {item.sale_item_id: item for item in all_items}
    requested_by_id = {r.sale_item_id: r for r in data.items}
    if len(requested_by_id) != len(data.items):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Each sale item can only appear once in a return.")

    lines: list[_Line] = []
    for requested in data.items:
        item = items_by_id.get(requested.sale_item_id)
        if item is None:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Sale item {requested.sale_item_id} is not on this sale.")
        remaining = item.quantity - already_returned(db, item.sale_item_id)
        if requested.quantity > remaining:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Only {remaining} of '{item.product_name}' can still be returned.")
        # Prorated from the line's own total, so returning the full quantity refunds exactly what was charged.
        refund = item.line_total if requested.quantity == item.quantity else money(item.line_total * requested.quantity / item.quantity)
        lines.append(_Line(item=item, quantity=requested.quantity, refund=refund, restock=requested.restock))

    refund_amount = sum((line.refund for line in lines), Decimal("0.00"))

    # 2. Money: reduce the customer's due first, then whatever is left is refunded by the chosen method.
    customer = db.get(Customer, sale.customer_id) if sale.customer_id is not None else None
    due_reduced = Decimal("0.00")
    if customer is not None and customer.outstanding_due > 0:
        due_reduced = min(refund_amount, customer.outstanding_due)
        if due_reduced > 0:
            customer.outstanding_due = customer.outstanding_due - due_reduced
            db.flush()
    cash_refund = refund_amount - due_reduced
    if cash_refund > 0 and data.refund_method is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "A refund method is required for the part not covered by the due.")

    # 3. Put restocked lines back (Module 4). A line marked "not restocked" (damaged/expired) skips this.
    for line in lines:
        if line.restock:
            stock_in(db, line.item.product_id, int(line.quantity), "sale_return", sale.sale_id, user_id)

    # 4. Reverse loyalty points earned on the refunded amount, in the same proportion they were earned.
    if customer is not None and sale.total_amount > 0:
        earned_share = money(sale.paid_amount * refund_amount / sale.total_amount)
        reversed_points = min(points_earned(earned_share), customer.loyalty_points)
        if reversed_points > 0:
            customer.loyalty_points -= reversed_points
            db.add(LoyaltyTransaction(customer_id=customer.customer_id, sale_id=sale.sale_id, transaction_type="reversal", points=-reversed_points, description=f"Return on sale {sale.sale_id}"))

    # 5. Save the return.
    sale_return = SaleReturn(
        sale_id=sale.sale_id,
        reason=data.reason,
        refund_amount=refund_amount,
        refund_method=data.refund_method if cash_refund > 0 else None,
        due_reduced=due_reduced,
        processed_by=user_id,
    )
    db.add(sale_return)
    db.flush()
    db.add_all(
        SaleReturnItem(sale_return_id=sale_return.sale_return_id, sale_item_id=line.item.sale_item_id, quantity=line.quantity, amount=line.refund, restocked=line.restock)
        for line in lines
    )
    db.flush()  # so already_returned() below sees this return's own rows too, regardless of the session's autoflush setting

    # 6. The sale is fully returned once every line's quantity has been returned across all its returns.
    fully_returned = all(item.quantity - already_returned(db, item.sale_item_id) <= 0 for item in all_items)
    sale.status = "returned" if fully_returned else "partially_returned"

    invoice_number = db.scalar(select(Invoice.invoice_number).where(Invoice.sale_id == sale.sale_id))
    return_number = f"RET-{datetime.now(timezone.utc).year}-{sale_return.sale_return_id:05d}"
    log_activity(db, user_id, "CREATE", "SaleReturn", reference=return_number, details=f"Sale {invoice_number}, refund {refund_amount}, reason: {data.reason}")
    db.flush()

    processor = db.get(User, user_id)
    return SaleReturnOut(
        sale_return_id=sale_return.sale_return_id,
        sale_id=sale.sale_id,
        invoice_number=invoice_number,
        return_number=return_number,
        reason=sale_return.reason,
        refund_amount=refund_amount,
        refund_method=sale_return.refund_method,
        due_reduced=due_reduced,
        processed_by_name=processor.full_name if processor else None,
        created_at=sale_return.created_at,
        items=[SaleReturnItemOut(sale_item_id=line.item.sale_item_id, product_name=line.item.product_name, quantity=line.quantity, amount=line.refund, restocked=line.restock) for line in lines],
    )
