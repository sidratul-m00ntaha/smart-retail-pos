"""The ONLY data the AI Assistant can reach (PRD 5.22).

Each function runs one fixed, parameterised query over the real tables and returns
plain numbers. The assistant may call these by name - it never writes or runs SQL of
its own, and nothing here changes any record.

Adding a function: write it here, register it in REPORT_FUNCTIONS at the bottom, and
add its question patterns to intents.py.
"""
from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal

from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import (
    Brand,
    Category,
    Customer,
    HeldCart,
    HeldCartItem,
    Invoice,
    LoyaltyTier,
    Payment,
    Product,
    ProductStock,
    Purchase,
    Sale,
    SaleItem,
    StockAdjustment,
    StockBatch,
    StockMovement,
    Supplier,
    TaxRate,
    Unit,
    User,
)

# Question periods the assistant understands
PERIODS = ("today", "yesterday", "week", "month", "all")


# ---------- helpers ----------
def _store_now() -> datetime:
    """Now in the store's own time, so "today" means the shop's day, not UTC's."""
    return datetime.now(timezone.utc) + timedelta(hours=settings.store_utc_offset_hours)


def _period_range(period: str) -> tuple[datetime | None, datetime | None]:
    """Start (included) and end (not included) of a period, as UTC values for the database."""
    if period == "all":
        return None, None

    today = _store_now().date()
    starts = {
        "today": today,
        "yesterday": today - timedelta(days=1),
        "week": today - timedelta(days=today.weekday()),  # Monday
        "month": today.replace(day=1),
    }
    start_day: date = starts.get(period, today)
    end_day = start_day + timedelta(days=1) if period == "yesterday" else today + timedelta(days=1)

    offset = timedelta(hours=settings.store_utc_offset_hours)
    return datetime.combine(start_day, time.min) - offset, datetime.combine(end_day, time.min) - offset


def _within_period(query: Select, column, period: str) -> Select:
    start, end = _period_range(period)
    if start is not None:
        query = query.where(column >= start)
    if end is not None:
        query = query.where(column < end)
    return query


def _money(value: Decimal | float | int | None) -> float:
    return round(float(value or 0), 2)


def _store_time(value: datetime) -> str:
    """A stored UTC time as the shop's own local time, so answers read like the till receipts."""
    return (value + timedelta(hours=settings.store_utc_offset_hours)).isoformat()


def _period_words(period: str) -> str:
    return {"today": "today", "yesterday": "yesterday", "week": "this week", "month": "this month", "all": "in total"}[period]


# ---------- approved report functions ----------
def sales_summary(db: Session, period: str = "today") -> dict:
    """Total sales, number of sales and average sale value for a period."""
    row = db.execute(
        _within_period(
            select(func.count(Sale.sale_id), func.sum(Sale.total_amount), func.sum(Sale.due_amount)).where(
                Sale.status != "returned"
            ),
            Sale.created_at,
            period,
        )
    ).one()
    count, total, due = row[0] or 0, _money(row[1]), _money(row[2])
    items = db.execute(
        _within_period(
            select(func.sum(SaleItem.quantity)).join(Sale, Sale.sale_id == SaleItem.sale_id).where(Sale.status != "returned"),
            Sale.created_at,
            period,
        )
    ).scalar()
    return {
        "period": period,
        "sales_count": count,
        "total_sales": total,
        "items_sold": _money(items),
        "average_sale": _money(total / count) if count else 0.0,
        "unpaid_amount": due,
    }


def top_products(db: Session, period: str = "month", limit: int = 5) -> dict:
    """Best selling products of a period, by amount sold."""
    rows = db.execute(
        _within_period(
            select(
                SaleItem.product_name,
                func.sum(SaleItem.quantity).label("quantity"),
                func.sum(SaleItem.line_subtotal).label("revenue"),
            )
            .join(Sale, Sale.sale_id == SaleItem.sale_id)
            .where(Sale.status != "returned")
            .group_by(SaleItem.product_name)
            .order_by(func.sum(SaleItem.line_subtotal).desc()),
            Sale.created_at,
            period,
        ).limit(max(1, min(limit, 20)))
    ).all()
    return {
        "period": period,
        "products": [{"name": name, "quantity": _money(qty), "revenue": _money(rev)} for name, qty, rev in rows],
    }


def payment_methods(db: Session, period: str = "today") -> dict:
    """How customers paid in a period (cash, card, digital)."""
    rows = db.execute(
        _within_period(
            select(Payment.method, func.count(Payment.payment_id), func.sum(Payment.amount))
            .join(Sale, Sale.sale_id == Payment.sale_id)
            .where(Sale.status != "returned")
            .group_by(Payment.method)
            .order_by(func.sum(Payment.amount).desc()),
            Payment.created_at,
            period,
        )
    ).all()
    return {
        "period": period,
        "methods": [{"method": method, "count": count, "amount": _money(amount)} for method, count, amount in rows],
    }


def low_stock(db: Session, limit: int = 10) -> dict:
    """Active products at or below their reorder level, and those out of stock."""
    rows = db.execute(
        select(Product.name, Product.current_quantity, Product.reorder_level)
        .where(Product.status == "active", Product.current_quantity <= Product.reorder_level)
        .order_by(Product.current_quantity)
        .limit(max(1, min(limit, 50)))
    ).all()
    out_of_stock = db.scalar(
        select(func.count(Product.product_id)).where(Product.status == "active", Product.current_quantity == 0)
    )
    low_count = db.scalar(
        select(func.count(Product.product_id)).where(
            Product.status == "active", Product.current_quantity > 0, Product.current_quantity <= Product.reorder_level
        )
    )
    return {
        "low_stock_count": low_count or 0,
        "out_of_stock_count": out_of_stock or 0,
        "products": [{"name": name, "in_stock": qty, "reorder_level": level} for name, qty, level in rows],
    }


def inventory_value(db: Session) -> dict:
    """What the stock on the shelves is worth, at purchase and at selling prices."""
    row = db.execute(
        select(
            func.count(Product.product_id),
            func.sum(Product.current_quantity),
            func.sum(Product.current_quantity * Product.purchase_price),
            func.sum(Product.current_quantity * Product.sale_price),
        ).where(Product.status == "active")
    ).one()
    return {
        "product_count": row[0] or 0,
        "units_in_stock": _money(row[1]),
        "purchase_value": _money(row[2]),
        "retail_value": _money(row[3]),
    }


def expiring_soon(db: Session, days: int = 30) -> dict:
    """Stock batches that expire within the given number of days, and those already expired."""
    days = max(1, min(days, 365))
    today = _store_now().date()
    rows = db.execute(
        select(StockBatch.batch_number, StockBatch.product_id, StockBatch.quantity, StockBatch.expiry_date)
        .where(StockBatch.quantity > 0, StockBatch.expiry_date <= today + timedelta(days=days))
        .order_by(StockBatch.expiry_date)
        .limit(20)
    ).all()
    names = dict(db.execute(select(Product.product_id, Product.name)).all())
    batches = [
        {
            "product": names.get(product_id, f"Product {product_id}"),
            "batch": batch,
            "quantity": quantity,
            "expiry_date": expiry.isoformat(),
            "days_left": (expiry - today).days,
        }
        for batch, product_id, quantity, expiry in rows
    ]
    return {
        "days": days,
        "expired_count": sum(1 for b in batches if b["days_left"] < 0),
        "expiring_count": sum(1 for b in batches if b["days_left"] >= 0),
        "batches": batches,
    }


def customer_dues(db: Session, limit: int = 5) -> dict:
    """How much customers owe the shop, and who owes the most."""
    total = db.scalar(select(func.sum(Customer.outstanding_due)))
    count = db.scalar(select(func.count(Customer.customer_id)).where(Customer.outstanding_due > 0))
    rows = db.execute(
        select(Customer.name, Customer.phone, Customer.outstanding_due)
        .where(Customer.outstanding_due > 0)
        .order_by(Customer.outstanding_due.desc())
        .limit(max(1, min(limit, 20)))
    ).all()
    return {
        "total_due": _money(total),
        "customers_with_due": count or 0,
        "customers": [{"name": name, "phone": phone, "due": _money(due)} for name, phone, due in rows],
    }


def supplier_dues(db: Session, limit: int = 5) -> dict:
    """How much the shop owes its suppliers."""
    total = db.scalar(select(func.sum(Purchase.Due)))
    rows = db.execute(
        select(Supplier.Name, func.sum(Purchase.Due))
        .join(Purchase, Purchase.SupplierID == Supplier.SupplierID)
        .group_by(Supplier.Name)
        .having(func.sum(Purchase.Due) > 0)
        .order_by(func.sum(Purchase.Due).desc())
        .limit(max(1, min(limit, 20)))
    ).all()
    return {
        "total_due": _money(total),
        "suppliers": [{"name": name, "due": _money(due)} for name, due in rows],
    }


def purchases_summary(db: Session, period: str = "month") -> dict:
    """What the shop bought from suppliers in a period."""
    row = db.execute(
        _within_period(
            select(func.count(Purchase.PurchaseID), func.sum(Purchase.Total), func.sum(Purchase.Paid), func.sum(Purchase.Due)),
            Purchase.PurchaseDate,
            period,
        )
    ).one()
    return {
        "period": period,
        "purchase_count": row[0] or 0,
        "total_amount": _money(row[1]),
        "paid_amount": _money(row[2]),
        "due_amount": _money(row[3]),
    }


def loyalty_summary(db: Session) -> dict:
    """Customers, loyalty points and how they are spread over the tiers."""
    customers = db.scalar(select(func.count(Customer.customer_id))) or 0
    points = db.scalar(select(func.sum(Customer.loyalty_points))) or 0
    rows = db.execute(
        select(LoyaltyTier.name, func.count(Customer.customer_id))
        .join(Customer, Customer.loyalty_tier_id == LoyaltyTier.loyalty_tier_id, isouter=True)
        .group_by(LoyaltyTier.name, LoyaltyTier.required_points)  # SQL Server: everything sorted on must be grouped
        .order_by(LoyaltyTier.required_points)
    ).all()
    return {
        "customer_count": customers,
        "total_points": int(points),
        "tiers": [{"tier": name, "customers": count} for name, count in rows],
    }


def product_lookup(db: Session, name: str = "") -> dict:
    """Price and stock of the products whose name or code matches the words asked about."""
    term = (name or "").strip()
    if not term:
        return {"search": term, "products": []}
    rows = db.execute(
        select(Product.name, Product.product_code, Product.sale_price, Product.current_quantity, Product.status)
        .where(Product.name.contains(term, autoescape=True) | Product.product_code.contains(term, autoescape=True))
        .order_by(Product.name)
        .limit(10)
    ).all()
    return {
        "search": term,
        "products": [
            {"name": n, "code": code, "price": _money(price), "in_stock": qty, "status": status}
            for n, code, price, qty, status in rows
        ],
    }


def recent_sales(db: Session, limit: int = 5) -> dict:
    """The latest sales at the till, with their invoice numbers."""
    rows = db.execute(
        select(Sale, Invoice.invoice_number, Customer.name)
        .join(Invoice, Invoice.sale_id == Sale.sale_id, isouter=True)
        .join(Customer, Customer.customer_id == Sale.customer_id, isouter=True)
        .order_by(Sale.sale_id.desc())
        .limit(max(1, min(limit, 20)))
    ).all()
    return {
        "sales": [
            {
                "invoice": invoice_number or f"sale {sale.sale_id}",
                "customer": customer_name or "Walk-in customer",
                "total": _money(sale.total_amount),
                "due": _money(sale.due_amount),
                "payment_status": sale.payment_status,
                "when": _store_time(sale.created_at),
            }
            for sale, invoice_number, customer_name in rows
        ]
    }


def invoice_lookup(db: Session, number: str = "") -> dict:
    """One invoice: what was sold, to whom, and whether it is paid."""
    term = (number or "").strip()
    if not term:
        return {"search": term, "invoices": []}
    rows = db.execute(
        select(Sale, Invoice.invoice_number, Customer.name)
        .join(Invoice, Invoice.sale_id == Sale.sale_id)
        .join(Customer, Customer.customer_id == Sale.customer_id, isouter=True)
        .where(Invoice.invoice_number.contains(term, autoescape=True))
        .order_by(Invoice.invoice_number.desc())
        .limit(5)
    ).all()

    invoices = []
    for sale, invoice_number, customer_name in rows:
        items = db.execute(
            select(SaleItem.product_name, SaleItem.quantity, SaleItem.line_subtotal).where(SaleItem.sale_id == sale.sale_id)
        ).all()
        invoices.append(
            {
                "invoice": invoice_number,
                "customer": customer_name or "Walk-in customer",
                "when": _store_time(sale.created_at),
                "total": _money(sale.total_amount),
                "paid": _money(sale.paid_amount),
                "due": _money(sale.due_amount),
                "payment_status": sale.payment_status,
                "items": [{"name": name, "quantity": _money(qty), "amount": _money(amount)} for name, qty, amount in items],
            }
        )
    return {"search": term, "invoices": invoices}


def unpaid_sales(db: Session, limit: int = 10) -> dict:
    """Sales that are not fully paid yet, newest first."""
    rows = db.execute(
        select(Sale, Invoice.invoice_number, Customer.name)
        .join(Invoice, Invoice.sale_id == Sale.sale_id, isouter=True)
        .join(Customer, Customer.customer_id == Sale.customer_id, isouter=True)
        .where(Sale.due_amount > 0, Sale.status != "returned")
        .order_by(Sale.sale_id.desc())
        .limit(max(1, min(limit, 20)))
    ).all()
    total_due = db.scalar(select(func.sum(Sale.due_amount)).where(Sale.due_amount > 0, Sale.status != "returned"))
    return {
        "total_due": _money(total_due),
        "count": len(rows),
        "sales": [
            {
                "invoice": invoice_number or f"sale {sale.sale_id}",
                "customer": customer_name or "Walk-in customer",
                "total": _money(sale.total_amount),
                "due": _money(sale.due_amount),
                "when": _store_time(sale.created_at),
            }
            for sale, invoice_number, customer_name in rows
        ],
    }


def sales_by_cashier(db: Session, period: str = "today") -> dict:
    """Who served how much at the till in a period."""
    rows = db.execute(
        _within_period(
            select(User.full_name, func.count(Sale.sale_id), func.sum(Sale.total_amount))
            .join(User, User.user_id == Sale.cashier_id)
            .where(Sale.status != "returned")
            .group_by(User.full_name)
            .order_by(func.sum(Sale.total_amount).desc()),
            Sale.created_at,
            period,
        )
    ).all()
    return {
        "period": period,
        "cashiers": [{"name": name, "sales_count": count, "total": _money(total)} for name, count, total in rows],
    }


def held_bills(db: Session) -> dict:
    """Bills paused at the till and not finished yet."""
    rows = db.execute(
        select(HeldCart, User.full_name, Customer.name, func.count(HeldCartItem.held_cart_item_id))
        .join(User, User.user_id == HeldCart.cashier_id, isouter=True)
        .join(Customer, Customer.customer_id == HeldCart.customer_id, isouter=True)
        .join(HeldCartItem, HeldCartItem.held_cart_id == HeldCart.held_cart_id, isouter=True)
        .where(HeldCart.status == "held")
        .group_by(
            HeldCart.held_cart_id,
            HeldCart.note,
            HeldCart.status,
            HeldCart.created_at,
            HeldCart.cashier_id,
            HeldCart.customer_id,
            HeldCart.updated_at,
            User.full_name,
            Customer.name,
        )
        .order_by(HeldCart.held_cart_id.desc())
        .limit(10)
    ).all()
    return {
        "count": len(rows),
        "bills": [
            {
                "note": cart.note or "no note",
                "cashier": cashier_name or "unknown",
                "customer": customer_name or "Walk-in customer",
                "items": item_count,
                "when": _store_time(cart.created_at),
            }
            for cart, cashier_name, customer_name, item_count in rows
        ],
    }


def stock_movements_summary(db: Session, period: str = "today") -> dict:
    """What moved in and out of stock in a period, and why."""
    rows = db.execute(
        _within_period(
            select(StockMovement.movement_type, StockMovement.source, func.count(), func.sum(StockMovement.quantity))
            .group_by(StockMovement.movement_type, StockMovement.source)
            .order_by(StockMovement.movement_type),
            StockMovement.created_at,
            period,
        )
    ).all()
    moved_in = sum(int(quantity or 0) for movement_type, _, _, quantity in rows if movement_type == "in")
    moved_out = sum(int(quantity or 0) for movement_type, _, _, quantity in rows if movement_type == "out")
    return {
        "period": period,
        "units_in": moved_in,
        "units_out": moved_out,
        "movements": [
            {"type": movement_type, "source": source, "count": count, "units": int(quantity or 0)}
            for movement_type, source, count, quantity in rows
        ],
    }


def catalog_summary(db: Session) -> dict:
    """How the catalog is set up: products, categories, brands, units and the VAT rates."""
    counts = {}
    for label, model, id_column in (
        ("categories", Category, Category.category_id),
        ("brands", Brand, Brand.brand_id),
        ("units", Unit, Unit.unit_id),
    ):
        counts[label] = db.scalar(select(func.count(id_column)).where(model.status == "active")) or 0

    rates = db.execute(
        select(TaxRate.name, TaxRate.rate_percent, TaxRate.status).order_by(TaxRate.rate_percent.desc())
    ).all()
    return {
        "products": db.scalar(select(func.count(Product.product_id)).where(Product.status == "active")) or 0,
        **counts,
        "vat_rates": [{"name": name, "percent": float(percent), "status": status} for name, percent, status in rates],
    }


def products_by_category(db: Session) -> dict:
    """How many products each category holds, and what that stock is worth."""
    rows = db.execute(
        select(
            Category.name,
            func.count(Product.product_id),
            func.sum(Product.current_quantity),
            func.sum(Product.current_quantity * Product.sale_price),
        )
        .join(Product, Product.category_id == Category.category_id)
        .where(Product.status == "active")
        .group_by(Category.name)
        .order_by(func.count(Product.product_id).desc())
    ).all()
    return {
        "categories": [
            {"name": name, "products": count, "units_in_stock": _money(units), "retail_value": _money(value)}
            for name, count, units, value in rows
        ]
    }


def customer_lookup(db: Session, name: str = "") -> dict:
    """One customer: what they owe, their credit room and their loyalty standing."""
    term = (name or "").strip()
    if not term:
        return {"search": term, "customers": []}
    rows = db.execute(
        select(Customer, LoyaltyTier.name)
        .join(LoyaltyTier, LoyaltyTier.loyalty_tier_id == Customer.loyalty_tier_id, isouter=True)
        .where(Customer.name.contains(term, autoescape=True) | Customer.phone.contains(term, autoescape=True))
        .order_by(Customer.name)
        .limit(5)
    ).all()
    return {
        "search": term,
        "customers": [
            {
                "name": customer.name,
                "phone": customer.phone,
                "due": _money(customer.outstanding_due),
                "credit_limit": _money(customer.credit_limit),
                "available_credit": _money(float(customer.credit_limit or 0) - float(customer.outstanding_due or 0)),
                "points": customer.loyalty_points,
                "tier": tier_name or "no tier",
                "status": customer.status,
            }
            for customer, tier_name in rows
        ],
    }


def supplier_lookup(db: Session, name: str = "") -> dict:
    """One supplier: how to reach them, what was bought and what is still owed."""
    term = (name or "").strip()
    if not term:
        return {"search": term, "suppliers": []}
    rows = db.execute(
        select(
            Supplier.Name,
            Supplier.Phone,
            Supplier.Status,
            func.count(Purchase.PurchaseID),
            func.sum(Purchase.Total),
            func.sum(Purchase.Due),
        )
        .join(Purchase, Purchase.SupplierID == Supplier.SupplierID, isouter=True)
        .where(Supplier.Name.contains(term, autoescape=True))
        .group_by(Supplier.Name, Supplier.Phone, Supplier.Status)
        .order_by(Supplier.Name)
        .limit(5)
    ).all()
    return {
        "search": term,
        "suppliers": [
            {
                "name": supplier_name,
                "phone": phone,
                "status": status,
                "purchases": count,
                "total_purchased": _money(total),
                "due": _money(due),
            }
            for supplier_name, phone, status, count, total, due in rows
        ],
    }


def stock_adjustments_summary(db: Session, period: str = "month") -> dict:
    """Manual stock corrections in a period, and the reasons given."""
    rows = db.execute(
        _within_period(
            select(StockAdjustment, Product.name, User.full_name)
            .join(Product, Product.product_id == StockAdjustment.product_id, isouter=True)
            .join(User, User.user_id == StockAdjustment.adjusted_by, isouter=True)
            .order_by(StockAdjustment.stock_adjustment_id.desc()),
            StockAdjustment.created_at,
            period,
        ).limit(10)
    ).all()
    totals = db.execute(
        _within_period(
            select(func.count(StockAdjustment.stock_adjustment_id), func.sum(StockAdjustment.quantity_change)),
            StockAdjustment.created_at,
            period,
        )
    ).one()
    return {
        "period": period,
        "count": totals[0] or 0,
        "net_change": int(totals[1] or 0),
        "adjustments": [
            {
                "product": product_name or f"product {adjustment.product_id}",
                "change": adjustment.quantity_change,
                "reason": adjustment.reason,
                "by": user_name or "unknown",
                "when": _store_time(adjustment.created_at),
            }
            for adjustment, product_name, user_name in rows
        ],
    }


def business_summary(db: Session) -> dict:
    """A short overall picture: today's sales, stock alerts and money owed both ways."""
    sales = sales_summary(db, "today")
    stock = low_stock(db, limit=3)
    return {
        "sales_today": sales["total_sales"],
        "sales_count_today": sales["sales_count"],
        "low_stock_count": stock["low_stock_count"],
        "out_of_stock_count": stock["out_of_stock_count"],
        "customer_due": customer_dues(db, limit=3)["total_due"],
        "supplier_due": supplier_dues(db, limit=3)["total_due"],
        "inventory_retail_value": inventory_value(db)["retail_value"],
        "held_bills": held_bills(db)["count"],
    }


# Name -> (function, what it answers). The assistant may only call these.
REPORT_FUNCTIONS = {
    "sales_summary": (sales_summary, "Sales totals for a period"),
    "top_products": (top_products, "Best selling products"),
    "payment_methods": (payment_methods, "Payment methods used"),
    "low_stock": (low_stock, "Products low on stock or out of stock"),
    "inventory_value": (inventory_value, "Value of the stock on hand"),
    "expiring_soon": (expiring_soon, "Batches expiring soon or already expired"),
    "customer_dues": (customer_dues, "Money customers owe"),
    "supplier_dues": (supplier_dues, "Money owed to suppliers"),
    "purchases_summary": (purchases_summary, "Purchases from suppliers in a period"),
    "loyalty_summary": (loyalty_summary, "Loyalty points and tiers"),
    "product_lookup": (product_lookup, "Price and stock of one product"),
    "recent_sales": (recent_sales, "The latest sales at the till"),
    "invoice_lookup": (invoice_lookup, "One invoice by its number"),
    "unpaid_sales": (unpaid_sales, "Sales that are not fully paid"),
    "sales_by_cashier": (sales_by_cashier, "Who sold how much at the till"),
    "held_bills": (held_bills, "Bills paused at the till"),
    "stock_movements_summary": (stock_movements_summary, "Stock moved in and out in a period"),
    "catalog_summary": (catalog_summary, "Categories, brands, units and VAT rates"),
    "products_by_category": (products_by_category, "How many products each category holds"),
    "customer_lookup": (customer_lookup, "One customer's due, credit and loyalty"),
    "supplier_lookup": (supplier_lookup, "One supplier's contact and balance"),
    "stock_adjustments_summary": (stock_adjustments_summary, "Manual stock corrections and their reasons"),
    "business_summary": (business_summary, "A short overall picture of the business"),
}


def run_report_function(db: Session, name: str, arguments: dict | None = None) -> dict:
    """Runs one approved function. Unknown names are refused - this is the safety gate."""
    if name not in REPORT_FUNCTIONS:
        raise ValueError(f"'{name}' is not an approved report function.")
    function, _ = REPORT_FUNCTIONS[name]
    return function(db, **(arguments or {}))
