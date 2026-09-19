"""Completing a sale (PRD 5.14) as ONE all-or-nothing transaction.

The functions this one calls in other modules (stock_out, add_due, add_points, log_activity) never
commit. complete_sale commits once at the very end, or rolls everything back, so a failed sale
leaves nothing half-saved: no sale, no stock change, no due, no points, no invoice.
"""
from dataclasses import dataclass
from datetime import datetime, timezone
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.customer import Customer
from app.models.sale import HeldCart, Invoice, Payment, Sale, SaleItem
from app.schemas.sale import PaymentOut, SaleCreate, SaleItemOut, SaleOut
from app.services.activity_log_service import log_activity
from app.services.customer_service import add_due, add_points
from app.services.sale_calculator import LineInput, calculate_sale, money, settle_payment
from app.services.sale_dependencies import get_sellable_product
from app.services.stock_service import stock_out

# ASSUMPTION until Module 6 / the PRD confirms the rule: 1 loyalty point for every 100 actually paid.
LOYALTY_POINTS_PER_100 = 1


@dataclass(frozen=True)
class CompletedSale:
    sale: SaleOut
    customer_phone: str | None  # for the SMS, which the router sends AFTER this function has committed


def points_earned(paid_amount: Decimal) -> int:
    """Points are earned on money actually paid, never on a due amount (PRD 5.13)."""
    return int(paid_amount // Decimal("100")) * LOYALTY_POINTS_PER_100


def complete_sale(db: Session, data: SaleCreate, cashier_id: int) -> CompletedSale:
    try:
        result = _build_and_save_sale(db, data, cashier_id)
        db.commit()  # the one and only commit
    except Exception:
        db.rollback()
        raise
    return result


def _build_and_save_sale(db: Session, data: SaleCreate, cashier_id: int) -> CompletedSale:
    # 1. Merge duplicate products and check quantities. Stock is counted in whole units for now.
    quantities: dict[int, Decimal] = {}
    for line in data.items:
        quantities[line.product_id] = quantities.get(line.product_id, Decimal("0")) + line.quantity
    for quantity in quantities.values():
        if quantity != quantity.to_integral_value():
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Quantities must be whole numbers.")

    # 2. Prices and VAT come from the database, never from the browser.
    products = {product_id: get_sellable_product(db, product_id) for product_id in quantities}

    # 3. Customer, loyalty discount and available credit (a guest has none of these).
    customer: Customer | None = None
    discount_percent = Decimal("0.00")
    available_credit = Decimal("0.00")
    if data.customer_id is not None:
        customer = db.get(Customer, data.customer_id)
        if customer is None or customer.status != "active":
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "The customer was not found or is not active.")
        if customer.loyalty_tier is not None:
            discount_percent = customer.loyalty_tier.discount_percent
        available_credit = customer.credit_limit - customer.outstanding_due

    # 4. Calculate the amounts and check the payment rules (guest, credit limit).
    try:
        totals = calculate_sale(
            [LineInput(pid, qty, products[pid].unit_price, products[pid].vat_percent) for pid, qty in quantities.items()],
            discount_percent,
        )
        settlement = settle_payment(
            totals.total_amount,
            [payment.amount for payment in data.payments],
            is_registered_customer=customer is not None,
            available_credit=available_credit,
        )
    except ValueError as err:  # includes PaymentError; the messages are safe to show the cashier
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(err)) from err

    # 5. A resumed bill must still be on hold, so the same bill can't be completed twice.
    held_cart: HeldCart | None = None
    if data.held_cart_id is not None:
        held_cart = db.get(HeldCart, data.held_cart_id)
        if held_cart is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "The held bill was not found.")
        if held_cart.status != "held":
            raise HTTPException(status.HTTP_409_CONFLICT, "This held bill was already completed or discarded.")

    # 6. Save the sale, its items and its payments.
    sale = Sale(
        customer_id=data.customer_id,
        cashier_id=cashier_id,
        subtotal=totals.subtotal,
        discount_percent=totals.discount_percent,
        discount_amount=totals.discount_amount,
        tax_amount=totals.tax_amount,
        total_amount=totals.total_amount,
        paid_amount=settlement.paid_amount,
        due_amount=settlement.due_amount,
        payment_status=settlement.payment_status,
    )
    db.add(sale)
    db.flush()  # gives the sale its id

    items = [
        SaleItem(
            sale_id=sale.sale_id,
            product_id=r.product_id,
            product_name=products[r.product_id].name,
            quantity=r.quantity,
            unit_price=r.unit_price,
            line_subtotal=r.line_subtotal,
            discount_amount=r.discount_amount,
            tax_percent=r.tax_percent,
            tax_amount=r.tax_amount,
            line_total=r.line_total,
        )
        for r in totals.lines
    ]
    payments = [Payment(sale_id=sale.sale_id, method=p.method, amount=money(p.amount)) for p in data.payments]
    db.add_all(items + payments)

    # 7. Take the items out of stock (Module 4). Sorted by product so two cashiers lock in the same order.
    for product_id in sorted(quantities):
        try:
            stock_out(db, product_id, int(quantities[product_id]), "sale", sale.sale_id, cashier_id)
        except ValueError as err:
            raise HTTPException(
                status.HTTP_409_CONFLICT, f"Not enough stock for '{products[product_id].name}'."
            ) from err

    # 8. Customer effects (Module 6): the due, then the points and the tier.
    # TODO(module 6): add_points does not write a LoyaltyTransactions row yet; ask its owner to add one.
    if customer is not None:
        if settlement.due_amount > 0:
            add_due(db, customer.customer_id, settlement.due_amount)
        points = points_earned(settlement.paid_amount)
        if points > 0:
            add_points(db, customer.customer_id, points)

    # 9. Invoice, held cart and activity log.
    invoice_number = f"INV-{datetime.now(timezone.utc).year}-{sale.sale_id:05d}"
    db.add(Invoice(sale_id=sale.sale_id, invoice_number=invoice_number))
    if held_cart is not None:
        held_cart.status = "completed"
    log_activity(
        db,
        cashier_id,
        "CREATE",
        "Sale",
        reference=invoice_number,
        details=f"Total {totals.total_amount}, paid {settlement.paid_amount}, due {settlement.due_amount}",
    )
    db.flush()

    return CompletedSale(
        sale=_to_sale_out(sale, invoice_number, items, payments),
        customer_phone=customer.phone if customer is not None else None,
    )


def _to_sale_out(sale: Sale, invoice_number: str, items: list[SaleItem], payments: list[Payment]) -> SaleOut:
    return SaleOut(
        sale_id=sale.sale_id,
        invoice_number=invoice_number,
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
