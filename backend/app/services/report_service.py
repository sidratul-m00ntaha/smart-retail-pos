"""Dashboard (5.19) and Reports (5.20) data.

STATUS: stand-in generators only. Modules 3 (Purchasing), 4 (Inventory),
5 (Sales/Invoices) and 6 (Customers/Loyalty) don't have real tables yet, so
every function below returns realistic sample numbers shaped exactly like
the eventual real response - except stock alerts and inventory counts,
which are computed for real from Products (this module's own table).

TO WIRE UP LATER - replace the body of each function once the owning
module's tables exist:
  - get_dashboard_data(): todays_sales/transactions/items_sold, customer_due,
    supplier_due, sales_over_time, sales_by_payment_method,
    purchases_vs_sales, top_products, loyalty_distribution, expiring_within_30
  - get_sales_report(): Module 5 Sales/SaleItems
  - get_purchase_report(): Module 3 Purchases/Suppliers
  - get_expiry_report(): Module 4 StockBatches
  - get_customer_report(): Module 6 Customers/CustomerPayments/Loyalty

Only THIS file needs to change when the real tables exist - routers stay
the same.
"""
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Product


def _real_stock_alerts(db: Session):
    """The one part of the dashboard Module 2 can already compute for real."""
    rows = db.scalars(select(Product).where(Product.status == "active")).all()
    low = sum(1 for p in rows if 0 < p.current_quantity <= p.reorder_level)
    out = sum(1 for p in rows if p.current_quantity == 0)
    return low, out


def get_dashboard_data(db: Session) -> dict:
    low_stock, out_of_stock = _real_stock_alerts(db)
    return {
        "alerts": {"low_stock": low_stock, "out_of_stock": out_of_stock, "expiring_within_30": 7},
        "metrics": {
            "todays_sales": Decimal("85450.00"),
            "transactions": 124,
            "items_sold": 463,
            "customer_due": Decimal("35000.00"),
            "supplier_due": Decimal("52000.00"),
        },
        "sales_over_time": {
            "week": [62, 58, 71, 66, 80, 95, 74],
            "month": [420, 480, 510, 560],
            "quarter": [1850, 2020, 2210],
        },
        "sales_by_payment_method": [
            {"label": "Cash", "value": 42000},
            {"label": "Card", "value": 18420},
            {"label": "Digital", "value": 25000},
        ],
        "top_products": [
            {"name": "Rice 5kg", "units_sold": 42, "percent_of_top": 100},
            {"name": "Cooking oil 1L", "units_sold": 31, "percent_of_top": 74},
            {"name": "Milk 1L", "units_sold": 27, "percent_of_top": 64},
            {"name": "Biscuit pack", "units_sold": 19, "percent_of_top": 45},
        ],
        "purchases_vs_sales": {
            "labels": ["W1", "W2", "W3", "W4"],
            "purchases": [38, 42, 30, 46],
            "sales": [42, 48, 51, 56],
        },
        "loyalty_distribution": [
            {"label": "Regular", "value": 540},
            {"label": "Silver", "value": 210},
            {"label": "Gold", "value": 90},
        ],
    }


def get_sales_report(db: Session, date_range: str) -> dict:
    presets = {
        "today": {"total": 85450, "tx": 124, "items": 463, "labels": ["9am", "11am", "1pm", "3pm", "5pm", "7pm", "9pm"], "data": [8, 10, 14, 12, 15, 16, 10.45]},
        "yesterday": {"total": 78200, "tx": 110, "items": 410, "labels": ["9am", "11am", "1pm", "3pm", "5pm", "7pm", "9pm"], "data": [7, 9, 12, 11, 14, 15, 10.2]},
        "week": {"total": 512000, "tx": 780, "items": 2870, "labels": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], "data": [62, 58, 71, 66, 80, 95, 80]},
        "month": {"total": 2040000, "tx": 3100, "items": 11400, "labels": ["W1", "W2", "W3", "W4"], "data": [420, 480, 510, 630]},
    }
    d = presets.get(date_range, presets["month"])
    return {
        "total_sales": Decimal(str(d["total"])),
        "transactions": d["tx"],
        "items_sold": d["items"],
        "avg_transaction_value": Decimal(str(round(d["total"] / d["tx"]))),
        "chart": {"labels": d["labels"], "data": d["data"]},
        "top_products": [
            {"name": "Rice 5kg", "units_sold": 42, "price": 550},
            {"name": "Cooking oil 1L", "units_sold": 31, "price": 180},
            {"name": "Milk 1L", "units_sold": 27, "price": 80},
            {"name": "Biscuit pack", "units_sold": 19, "price": 60},
        ],
        "payment_methods": [
            {"label": "Cash", "value": 42000},
            {"label": "Card", "value": 18420},
            {"label": "Digital", "value": 25000},
        ],
    }


def get_purchase_report(db: Session) -> dict:
    return {
        "total_purchases": Decimal("640000.00"),
        "purchases_by_supplier": [
            {"label": "ACI Foods", "value": 220000},
            {"label": "Rupchanda Distribution", "value": 160000},
            {"label": "Wheel Supplies", "value": 140000},
            {"label": "Others", "value": 120000},
        ],
        "supplier_outstanding": Decimal("52000.00"),
    }


def get_inventory_report(db: Session) -> dict:
    rows = db.scalars(select(Product).where(Product.status == "active")).all()
    low = [p for p in rows if 0 < p.current_quantity <= p.reorder_level]
    out = [p for p in rows if p.current_quantity == 0]
    stock_value = sum((p.current_quantity or 0) * float(p.purchase_price or 0) for p in rows)
    return {
        "total_products": len(rows),
        "low_stock": len(low),
        "out_of_stock": len(out),
        "total_stock_value": Decimal(str(round(stock_value, 2))),
        "current_stock": [
            {
                "name": p.name,
                "category": p.category.name if p.category else "-",
                "stock": p.current_quantity,
                "reorder_level": p.reorder_level,
                "status": "Out of stock" if p.current_quantity == 0 else ("Low" if p.current_quantity <= p.reorder_level else "OK"),
            }
            for p in rows
        ],
        # Module 4 owns real stock movement history - placeholder until wired up.
        "recent_movements": [],
    }


def get_expiry_report(db: Session) -> list:
    # Module 4 owns StockBatches / expiry dates - placeholder sample rows.
    return [
        {"level": "Expired", "product_name": "Milk 1L", "batch": "B-2201", "quantity": 4, "expiry_date": "2026-09-10"},
        {"level": "Within7", "product_name": "Biscuit pack", "batch": "B-2255", "quantity": 20, "expiry_date": "2026-09-23"},
        {"level": "Within30", "product_name": "Cola 500ml", "batch": "B-2290", "quantity": 40, "expiry_date": "2026-10-12"},
    ]


def get_customer_report(db: Session) -> dict:
    # Module 6 owns Customers/CustomerPayments/Loyalty - placeholder sample rows.
    return {
        "top_customers": [
            {"rank": 1, "name": "Rahim Ahmed", "tier": "Gold", "total_spent": 84500},
            {"rank": 2, "name": "Salma Khatun", "tier": "Silver", "total_spent": 61200},
            {"rank": 3, "name": "Kamal Hossain", "tier": "Silver", "total_spent": 52800},
        ],
        "customer_due_total": Decimal("35000.00"),
        "loyalty_distribution": [
            {"label": "Regular", "value": 540},
            {"label": "Silver", "value": 210},
            {"label": "Gold", "value": 90},
        ],
        "customer_due_rows": [
            {"name": "Rahim Ahmed", "credit_limit": 20000, "outstanding_due": 8000},
            {"name": "Salma Khatun", "credit_limit": 15000, "outstanding_due": 5000},
        ],
    }
