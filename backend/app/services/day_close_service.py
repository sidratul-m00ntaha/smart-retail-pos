"""End-of-day closing report (Module 5 extension).

get_day_close() is read-only. It adds up one store-local day: the sales, the money received by each payment method,
customer due payments, refunds, and each cashier's sales. Everything comes from rows that already exist.

    cash the drawer should hold = opening cash + cash on sales + cash due payments - cash refunds

save_day_close() records the count next to that figure. The expected cash is always worked out again on the server,
so a browser can't send its own "expected" number.
"""
from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import DayClosing, User
from app.models.customer import CustomerPayment
from app.models.sale import Payment, Sale
from app.models.sale_return import SaleReturn
from app.schemas.day_close import CashierTotals, DayCloseOut, DayCloseSave, DayClosingOut, DayTotals, MethodTotals
from app.services.activity_log_service import log_activity

ZERO = Decimal("0.00")
METHOD_ORDER = ["cash", "card", "digital", "bkash", "nagad", "rocket"]


def store_today() -> date:
    return (datetime.now(timezone.utc) + timedelta(hours=settings.store_utc_offset_hours)).date()


def _day_bounds(day: date) -> tuple[datetime, datetime]:
    """UTC start and end of a store-local day (the same rule the dashboard uses)."""
    start = datetime.combine(day, time.min) - timedelta(hours=settings.store_utc_offset_hours)
    return start, start + timedelta(days=1)


def _money(value) -> Decimal:
    return Decimal(str(value or 0)).quantize(Decimal("0.01"))


def get_day_close(db: Session, day: date | None = None) -> DayCloseOut:
    day = day or store_today()
    if day > store_today():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "That day hasn't happened yet.")
    start, end = _day_bounds(day)

    sales = db.execute(
        select(
            func.count(Sale.sale_id),
            func.sum(Sale.total_amount),
            func.sum(Sale.discount_amount),
            func.sum(Sale.tax_amount),
            func.sum(Sale.paid_amount),
            func.sum(Sale.due_amount),
        ).where(Sale.created_at >= start, Sale.created_at < end)
    ).one()

    on_sales = {m: _money(a) for m, a in db.execute(
        select(Payment.method, func.sum(Payment.amount)).where(Payment.created_at >= start, Payment.created_at < end).group_by(Payment.method)
    )}
    on_dues = {m: _money(a) for m, a in db.execute(
        select(CustomerPayment.method, func.sum(CustomerPayment.amount))
        .where(CustomerPayment.created_at >= start, CustomerPayment.created_at < end)
        .group_by(CustomerPayment.method)
    )}
    # A refund is partly taken off the customer's due; only the rest was handed back, by refund_method.
    refunded = {m: _money(a) for m, a in db.execute(
        select(SaleReturn.refund_method, func.sum(SaleReturn.refund_amount - SaleReturn.due_reduced))
        .where(SaleReturn.refund_method.is_not(None), SaleReturn.created_at >= start, SaleReturn.created_at < end)
        .group_by(SaleReturn.refund_method)
    )}
    returns_total = _money(db.scalar(select(func.sum(SaleReturn.refund_amount)).where(SaleReturn.created_at >= start, SaleReturn.created_at < end)))

    gross = _money(sales[1])
    totals = DayTotals(
        transactions=sales[0] or 0,
        gross_sales=gross,
        discount_amount=_money(sales[2]),
        tax_amount=_money(sales[3]),
        paid_amount=_money(sales[4]),
        due_amount=_money(sales[5]),
        returns_total=returns_total,
        net_sales=gross - returns_total,
        dues_collected=sum(on_dues.values(), ZERO),
    )

    used = set(on_sales) | set(on_dues) | set(refunded) | {"cash"}
    ordered = [m for m in METHOD_ORDER if m in used] + sorted(used - set(METHOD_ORDER))
    methods = [
        MethodTotals(
            method=m,
            sales_received=on_sales.get(m, ZERO),
            dues_received=on_dues.get(m, ZERO),
            refunded=refunded.get(m, ZERO),
            net=on_sales.get(m, ZERO) + on_dues.get(m, ZERO) - refunded.get(m, ZERO),
        )
        for m in ordered
    ]
    cash_net = next(row.net for row in methods if row.method == "cash")

    cashiers = _cashier_totals(db, start, end)
    previous = db.scalar(select(DayClosing.counted_cash).where(DayClosing.business_date < day).order_by(DayClosing.business_date.desc()).limit(1))

    return DayCloseOut(
        business_date=day,
        totals=totals,
        methods=methods,
        cashiers=cashiers,
        cash_net=cash_net,
        suggested_opening_cash=_money(previous),
        closing=_saved_closing(db, day),
    )


def _cashier_totals(db: Session, start: datetime, end: datetime) -> list[CashierTotals]:
    rows = db.execute(
        select(Sale.cashier_id, User.full_name, func.count(Sale.sale_id), func.sum(Sale.total_amount), func.sum(Sale.due_amount))
        .join(User, User.user_id == Sale.cashier_id)
        .where(Sale.created_at >= start, Sale.created_at < end)
        .group_by(Sale.cashier_id, User.full_name)
        .order_by(func.sum(Sale.total_amount).desc())
    ).all()
    cash: dict[int, Decimal] = {}
    other: dict[int, Decimal] = {}
    for cashier_id, method, amount in db.execute(
        select(Sale.cashier_id, Payment.method, func.sum(Payment.amount))
        .join(Sale, Sale.sale_id == Payment.sale_id)
        .where(Payment.created_at >= start, Payment.created_at < end)
        .group_by(Sale.cashier_id, Payment.method)
    ):
        target = cash if method == "cash" else other
        target[cashier_id] = target.get(cashier_id, ZERO) + _money(amount)
    return [
        CashierTotals(
            cashier_id=cashier_id,
            cashier_name=name,
            transactions=count,
            total_amount=_money(total),
            cash_received=cash.get(cashier_id, ZERO),
            other_received=other.get(cashier_id, ZERO),
            due_amount=_money(due),
        )
        for cashier_id, name, count, total, due in rows
    ]


def _saved_closing(db: Session, day: date) -> DayClosingOut | None:
    row = db.execute(
        select(DayClosing, User.full_name).join(User, User.user_id == DayClosing.closed_by).where(DayClosing.business_date == day)
    ).first()
    if row is None:
        return None
    closing, closer = row
    return DayClosingOut(
        business_date=closing.business_date,
        opening_cash=closing.opening_cash,
        expected_cash=closing.expected_cash,
        counted_cash=closing.counted_cash,
        difference=closing.difference,
        note=closing.note,
        closed_by_name=closer,
        updated_at=closing.updated_at,
    )


def save_day_close(db: Session, user_id: int, data: DayCloseSave) -> DayCloseOut:
    """Records the cash count for a day. Closing the same day again replaces the earlier count."""
    day = data.business_date or store_today()
    report = get_day_close(db, day)  # also rejects a day in the future
    expected = data.opening_cash + report.cash_net
    difference = data.counted_cash - expected
    note = data.note.strip() if data.note and data.note.strip() else None

    closing = db.scalar(select(DayClosing).where(DayClosing.business_date == day))
    if closing is None:
        closing = DayClosing(business_date=day, closed_by=user_id, opening_cash=ZERO, expected_cash=ZERO, counted_cash=ZERO, difference=ZERO)
        db.add(closing)
    closing.opening_cash = data.opening_cash
    closing.expected_cash = expected
    closing.counted_cash = data.counted_cash
    closing.difference = difference
    closing.note = note
    closing.closed_by = user_id
    log_activity(
        db,
        user_id,
        "UPDATE" if closing.day_closing_id is not None else "CREATE",
        "DayClosing",
        reference=day.isoformat(),
        details=f"Expected cash {expected}, counted {data.counted_cash}, difference {difference}",
    )
    db.commit()
    return get_day_close(db, day)
