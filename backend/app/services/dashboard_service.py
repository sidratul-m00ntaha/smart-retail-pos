"""Real dashboard data (PRD 5.19) - every number here comes from an actual
table, computed at request time. There is no stand-in/sample data left:
Modules 3 (Purchasing), 4 (Inventory), 5 (Sales) and 6 (Customers/Loyalty)
are all on main now, so this queries them directly.

"Live" here means "recomputed on every request" - the dashboard has no
separate cache or event feed, so the moment a sale completes in the POS
(Module 5) or a purchase is confirmed (Module 3), the next time this page
loads or refreshes it reflects that immediately, because it's reading the
same Sales/Purchases/Customers rows those pages just wrote.
"""
from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import Customer, LoyaltyTier, Payment, Product, Purchase, Sale, SaleItem, StockBatch


# ---------- store-timezone helpers (mirrors app/services/ai/report_functions.py) ----------
def _store_today() -> date:
    return (datetime.now(timezone.utc) + timedelta(hours=settings.store_utc_offset_hours)).date()


def _day_bounds(day: date) -> tuple[datetime, datetime]:
    """UTC start/end instants for a given store-local calendar day."""
    offset = timedelta(hours=settings.store_utc_offset_hours)
    start = datetime.combine(day, time.min) - offset
    end = start + timedelta(days=1)
    return start, end


def _money(value) -> float:
    return round(float(value or 0), 2)


# ---------- stock alerts (fully Module 2's own table) ----------
def _stock_alerts(db: Session) -> dict:
    rows = db.scalars(select(Product).where(Product.status == "active")).all()
    low = sum(1 for p in rows if 0 < p.current_quantity <= p.reorder_level)
    out = sum(1 for p in rows if p.current_quantity == 0)

    today = _store_today()
    expiring = db.scalar(
        select(func.count(StockBatch.stock_batch_id)).where(
            StockBatch.quantity > 0,
            StockBatch.expiry_date >= today,
            StockBatch.expiry_date <= today + timedelta(days=30),
        )
    ) or 0
    return {"low_stock": low, "out_of_stock": out, "expiring_within_30": expiring}


# ---------- today's headline metrics ----------
def _todays_metrics(db: Session) -> dict:
    start, end = _day_bounds(_store_today())
    sales_row = db.execute(
        select(func.count(Sale.sale_id), func.sum(Sale.total_amount))
        .where(Sale.status != "returned", Sale.created_at >= start, Sale.created_at < end)
    ).one()
    transactions, todays_sales = sales_row[0] or 0, _money(sales_row[1])

    items_sold = db.scalar(
        select(func.sum(SaleItem.quantity))
        .join(Sale, Sale.sale_id == SaleItem.sale_id)
        .where(Sale.status != "returned", Sale.created_at >= start, Sale.created_at < end)
    )

    customer_due = _money(db.scalar(select(func.sum(Customer.outstanding_due))))
    supplier_due = _money(db.scalar(select(func.sum(Purchase.Due))))

    return {
        "todays_sales": todays_sales,
        "transactions": transactions,
        "items_sold": _money(items_sold),
        "customer_due": customer_due,
        "supplier_due": supplier_due,
    }


# ---------- sales-over-time chart (week / month / quarter tabs) ----------
def _week_buckets(db: Session) -> list[float]:
    """Daily totals, Monday through Sunday of the current store week, in
    thousands of Tk (the chart's y-axis is labelled 'Tk Xk')."""
    today = _store_today()
    monday = today - timedelta(days=today.weekday())
    values = []
    for i in range(7):
        day = monday + timedelta(days=i)
        start, end = _day_bounds(day)
        total = db.scalar(
            select(func.sum(Sale.total_amount)).where(
                Sale.status != "returned", Sale.created_at >= start, Sale.created_at < end
            )
        )
        values.append(round(_money(total) / 1000, 2))
    return values


def _month_buckets(db: Session) -> list[float]:
    """Weekly totals (up to 5 buckets) for the current calendar month, in thousands of Tk."""
    today = _store_today()
    month_start = today.replace(day=1)
    next_month = (month_start.replace(day=28) + timedelta(days=4)).replace(day=1)
    values = []
    cursor = month_start
    while cursor < next_month:
        week_end = min(cursor + timedelta(days=7), next_month)
        start, _ = _day_bounds(cursor)
        _, end = _day_bounds(week_end - timedelta(days=1))
        total = db.scalar(
            select(func.sum(Sale.total_amount)).where(
                Sale.status != "returned", Sale.created_at >= start, Sale.created_at < end
            )
        )
        values.append(round(_money(total) / 1000, 2))
        cursor = week_end
    return values


def _quarter_buckets(db: Session) -> list[float]:
    """Totals for each of the last 3 calendar months (oldest first), in thousands of Tk."""
    today = _store_today()
    values = []
    month_start = today.replace(day=1)
    months = []
    cursor = month_start
    for _ in range(3):
        months.append(cursor)
        cursor = (cursor - timedelta(days=1)).replace(day=1)
    for month_start in reversed(months):
        next_month = (month_start.replace(day=28) + timedelta(days=4)).replace(day=1)
        start, _ = _day_bounds(month_start)
        _, end = _day_bounds(next_month - timedelta(days=1))
        total = db.scalar(
            select(func.sum(Sale.total_amount)).where(
                Sale.status != "returned", Sale.created_at >= start, Sale.created_at < end
            )
        )
        values.append(round(_money(total) / 1000, 2))
    return values


# ---------- this month's breakdown charts ----------
def _month_bounds(db_today: date) -> tuple[datetime, datetime]:
    month_start = db_today.replace(day=1)
    next_month = (month_start.replace(day=28) + timedelta(days=4)).replace(day=1)
    start, _ = _day_bounds(month_start)
    _, end = _day_bounds(next_month - timedelta(days=1))
    return start, end


def _sales_by_payment_method(db: Session) -> list[dict]:
    start, end = _month_bounds(_store_today())
    rows = db.execute(
        select(Payment.method, func.sum(Payment.amount))
        .join(Sale, Sale.sale_id == Payment.sale_id)
        .where(Sale.status != "returned", Payment.created_at >= start, Payment.created_at < end)
        .group_by(Payment.method)
        .order_by(func.sum(Payment.amount).desc())
    ).all()
    return [{"label": method, "value": _money(amount)} for method, amount in rows]


def _top_products(db: Session, limit: int = 4) -> list[dict]:
    start, end = _month_bounds(_store_today())
    rows = db.execute(
        select(SaleItem.product_name, func.sum(SaleItem.quantity))
        .join(Sale, Sale.sale_id == SaleItem.sale_id)
        .where(Sale.status != "returned", Sale.created_at >= start, Sale.created_at < end)
        .group_by(SaleItem.product_name)
        .order_by(func.sum(SaleItem.quantity).desc())
        .limit(limit)
    ).all()
    if not rows:
        return []
    top_units = float(rows[0][1] or 1)
    return [
        {"name": name, "units_sold": _money(qty), "percent_of_top": round((float(qty or 0) / top_units) * 100)}
        for name, qty in rows
    ]


def _purchases_vs_sales(db: Session) -> dict:
    """Weekly Purchases.Total vs Sales.total_amount for the current month."""
    today = _store_today()
    month_start = today.replace(day=1)
    next_month = (month_start.replace(day=28) + timedelta(days=4)).replace(day=1)
    labels, purchases, sales = [], [], []
    cursor = month_start
    week_no = 1
    while cursor < next_month:
        week_end = min(cursor + timedelta(days=7), next_month)
        start, _ = _day_bounds(cursor)
        _, end = _day_bounds(week_end - timedelta(days=1))

        sales_total = db.scalar(
            select(func.sum(Sale.total_amount)).where(
                Sale.status != "returned", Sale.created_at >= start, Sale.created_at < end
            )
        )
        purchases_total = db.scalar(
            select(func.sum(Purchase.Total)).where(Purchase.PurchaseDate >= start, Purchase.PurchaseDate < end)
        )

        labels.append(f"W{week_no}")
        sales.append(round(_money(sales_total) / 1000, 2))
        purchases.append(round(_money(purchases_total) / 1000, 2))
        cursor = week_end
        week_no += 1
    return {"labels": labels, "purchases": purchases, "sales": sales}


def _loyalty_distribution(db: Session) -> list[dict]:
    rows = db.execute(
        select(LoyaltyTier.name, func.count(Customer.customer_id))
        .join(Customer, Customer.loyalty_tier_id == LoyaltyTier.loyalty_tier_id, isouter=True)
        .group_by(LoyaltyTier.name, LoyaltyTier.required_points)  # SQL Server: ORDER BY columns must be grouped
        .order_by(LoyaltyTier.required_points)
    ).all()
    return [{"label": name, "value": count} for name, count in rows]


def get_dashboard_data(db: Session) -> dict:
    return {
        "alerts": _stock_alerts(db),
        "metrics": _todays_metrics(db),
        "sales_over_time": {
            "week": _week_buckets(db),
            "month": _month_buckets(db),
            "quarter": _quarter_buckets(db),
        },
        "sales_by_payment_method": _sales_by_payment_method(db),
        "top_products": _top_products(db),
        "purchases_vs_sales": _purchases_vs_sales(db),
        "loyalty_distribution": _loyalty_distribution(db),
    }
