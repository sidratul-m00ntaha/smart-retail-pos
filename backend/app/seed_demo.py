"""Seeds demo data for Module 5 and the modules around it: customers, sales (some on due), due payments,
returns and a held bill, so the Dashboard, Sales page and Customers page have something real to show.

Everything goes through the real services (complete_sale, create_return), so stock, points, invoices and
activity logs all come out consistent. Dates are then moved into the last two weeks.

Run from the backend folder, with .venv active, AFTER python -m app.init_db and python -m app.seed_products:
    python -m app.seed_demo

Safe to run again: if the demo customers already exist, it does nothing. To start clean:
    python -m app.init_db --reset
    python -m app.seed_products
    python -m app.seed_demo
"""
import sys
from datetime import datetime, timedelta, timezone
from decimal import Decimal as D

from sqlalchemy import select
from sqlalchemy.orm import Session

from app import models  # noqa: F401  (loads every table definition)
from app.core.config import settings
from app.database import SessionLocal
from app.models import Product, User
from app.models.customer import Customer, CustomerPayment, LoyaltyTier
from app.models.sale import HeldCart, HeldCartItem, Invoice, Payment, Sale
from app.models.sale_return import SaleReturn
from app.models.stock import ProductStock
from app.schemas.sale import PaymentIn, SaleCreate, SaleLineIn, SaleOut
from app.schemas.sale_return import ReturnLineIn, SaleReturnCreate
from app.services.activity_log_service import log_activity
from app.services.sale_calculator import LineInput, calculate_sale, money
from app.services.sale_dependencies import get_sellable_product
from app.services.sale_return_service import create_return
from app.services.sale_service import complete_sale

# key, name, phone, credit limit
CUSTOMERS = [
    ("A", "Rahim Uddin", "01711000001", "25000"),
    ("B", "Nusrat Jahan", "01711000002", "25000"),
    ("C", "Tanvir Ahmed", "01711000003", "15000"),
    ("D", "Sumaiya Akter", "01711000004", "8000"),
]
DEMO_PHONES = [phone for _, _, phone, _ in CUSTOMERS]

# The demo sales and returns use at most about 8 units of any one product, so this is plenty.
MIN_STOCK = 15

# label, (days ago, hours ago), customer key (None = guest), {product number: quantity}, payment split.
# The split is a list of (method, share of the total). Shares adding up to 1 = paid in full; less than 1 = the
# rest is on due; an empty list = everything on due (only for registered customers).
# Listed oldest first: the order of the list is the order the sales are made in.
SALES = [
    ("g1", (13, 5), None, {0: 2, 1: 1}, [("cash", "1")]),
    ("a1", (12, 3), "A", {2: 2, 3: 1}, [("card", "1")]),
    ("b1", (11, 6), "B", {1: 3, 4: 1}, [("digital", "1")]),
    ("g2", (9, 2), None, {5: 1, 6: 2}, [("cash", "0.5"), ("card", "0.5")]),
    ("c1", (8, 4), "C", {0: 3, 7: 2}, [("cash", "0.4")]),  # 60% on due
    ("a2", (6, 1), "A", {4: 2, 2: 1}, []),  # everything on due
    ("b2", (5, 7), "B", {6: 1, 3: 2}, [("cash", "0.5")]),  # half on due
    ("d1", (4, 2), "D", {1: 2}, [("digital", "1")]),
    ("c2", (3, 5), "C", {5: 2, 2: 2}, []),  # everything on due
    ("g3", (2, 3), None, {7: 1, 0: 1}, [("card", "1")]),
    ("a3", (1, 4), "A", {3: 2, 6: 1}, [("cash", "1")]),
    ("t1", (0, 4), "B", {2: 1, 5: 1}, [("card", "1")]),  # today
    ("t2", (0, 1), None, {4: 1}, [("cash", "1")]),  # today
]

# customer key, (days ago, hours ago), share of what the customer owes at that moment, method
DUE_PAYMENTS = [
    ("A", (4, 0), "0.5", "cash"),
    ("C", (2, 0), "0.3", "digital"),
    ("A", (0, 3), "0.25", "cash"),
]


def ago(days: int, hours: int) -> datetime:
    """A UTC time without a zone, like the database stores them."""
    return datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=days, hours=hours)


def ensure_tiers(db: Session) -> list[LoyaltyTier]:
    """Uses the loyalty tiers that exist; creates Regular / Silver / Gold only when there are none."""
    tiers = list(db.scalars(select(LoyaltyTier).order_by(LoyaltyTier.required_points)))
    if not tiers:
        db.add_all([
            LoyaltyTier(name="Regular", required_points=0, discount_percent=D("0.00")),
            LoyaltyTier(name="Silver", required_points=200, discount_percent=D("3.00")),
            LoyaltyTier(name="Gold", required_points=500, discount_percent=D("5.00")),
        ])
        db.commit()
        tiers = list(db.scalars(select(LoyaltyTier).order_by(LoyaltyTier.required_points)))
    return tiers


def seed_customers(db: Session) -> dict[str, Customer]:
    tiers = ensure_tiers(db)
    tier_for = {"A": tiers[-1], "B": tiers[len(tiers) // 2], "C": None, "D": tiers[0]}
    customers: dict[str, Customer] = {}
    for key, name, phone, credit in CUSTOMERS:
        tier = tier_for[key]
        customer = Customer(
            name=name,
            phone=phone,
            credit_limit=D(credit),
            outstanding_due=D("0"),
            loyalty_points=tier.required_points if tier else 0,
            loyalty_tier_id=tier.loyalty_tier_id if tier else None,
        )
        db.add(customer)
        customers[key] = customer
    db.commit()
    return customers


def pick_products(db: Session) -> list[Product]:
    """Eight active products with enough stock, from the middle of the price range.
    Available stock follows the same rule as a sale: Module 4's ProductStock row when there is one, otherwise the
    product's own quantity."""
    stock_rows = {product_id: stock for product_id, stock in db.execute(select(ProductStock.product_id, ProductStock.current_stock))}
    active = list(db.scalars(select(Product).where(Product.status == "active").order_by(Product.sale_price)))
    rows = [product for product in active if stock_rows.get(product.product_id, product.current_quantity) >= MIN_STOCK]
    start = len(rows) // 4
    chosen = rows[start : start + 8]
    if len(chosen) < 8:
        chosen = rows[:8]
    if len(chosen) < 8:
        sys.exit(
            f"Not enough products with stock: {len(active)} active products, {len(rows)} with at least {MIN_STOCK} in stock "
            "(8 are needed). Add stock on the Inventory or Purchasing page, or run python -m app.seed_products."
        )
    return chosen


def total_for(db: Session, items: dict[int, int], discount_percent: D) -> D:
    """The total the server will work out for this cart (same functions, same rules)."""
    products = {product_id: get_sellable_product(db, product_id) for product_id in items}
    totals = calculate_sale(
        [LineInput(pid, D(qty), products[pid].unit_price, products[pid].vat_percent) for pid, qty in items.items()],
        discount_percent,
    )
    return totals.total_amount


def payments_for(total: D, split: list[tuple[str, str]]) -> list[PaymentIn]:
    shares = [D(share) for _, share in split]
    paid_in_full = sum(shares) == 1
    payments: list[PaymentIn] = []
    used = D("0")
    for index, (method, _) in enumerate(split):
        last = index == len(split) - 1
        amount = total - used if paid_in_full and last else money(total * shares[index])
        used += amount
        if amount > 0:
            payments.append(PaymentIn(method=method, amount=amount))
    return payments


def set_dates(db: Session, sale_id: int, when: datetime) -> None:
    """complete_sale stamps the sale with "now"; move the sale, its invoice and its payments to the demo date."""
    db.get(Sale, sale_id).created_at = when
    invoice = db.scalar(select(Invoice).where(Invoice.sale_id == sale_id))
    if invoice is not None:
        invoice.created_at = when
    for payment in db.scalars(select(Payment).where(Payment.sale_id == sale_id)):
        payment.created_at = when
    db.commit()


def seed_sales(db: Session, admin: User, customers: dict[str, Customer], products: list[Product]) -> dict[str, SaleOut]:
    made: dict[str, SaleOut] = {}
    for label, (days, hours), key, cart, split in SALES:
        customer = customers[key] if key else None
        discount = D("0")
        if customer is not None:
            db.refresh(customer)
            if customer.loyalty_tier is not None:
                discount = D(str(customer.loyalty_tier.discount_percent))
        items = {products[number].product_id: quantity for number, quantity in cart.items()}
        total = total_for(db, items, discount)
        request = SaleCreate(
            customer_id=customer.customer_id if customer else None,
            items=[SaleLineIn(product_id=pid, quantity=D(quantity)) for pid, quantity in items.items()],
            payments=payments_for(total, split),
        )
        sale = complete_sale(db, request, cashier_id=admin.user_id).sale
        set_dates(db, sale.sale_id, ago(days, hours))
        made[label] = sale
    return made


def seed_due_payments(db: Session, admin: User, customers: dict[str, Customer]) -> int:
    """Records a payment the way the Customers > Due Payments page does: a CustomerPayments row, and a lower due."""
    recorded = 0
    for key, (days, hours), share, method in DUE_PAYMENTS:
        customer = customers[key]
        db.refresh(customer)
        owed = D(str(customer.outstanding_due))
        amount = money(owed * D(share))
        if amount <= 0:
            continue
        payment = CustomerPayment(customer_id=customer.customer_id, amount=amount, method=method, recorded_by=admin.user_id, created_at=ago(days, hours))
        db.add(payment)
        db.flush()
        customer.outstanding_due = owed - amount
        log_activity(
            db,
            admin.user_id,
            "CREATE",
            "CustomerPayment",
            reference=str(payment.customer_payment_id),
            details=f"Received {amount} from {customer.name} ({method})",
        )
        db.commit()
        recorded += 1
    return recorded


def seed_returns(db: Session, admin: User, sales: dict[str, SaleOut], products: list[Product]) -> int:
    """Two returns: a guest refund in cash (damaged goods, not restocked), and a customer return that is
    taken off the customer's due (restocked)."""
    plan = [
        ("g1", 1, "Packaging was damaged", False, ago(12, 0)),
        ("b2", 3, "Customer changed their mind", True, ago(4, 5)),
    ]
    for label, product_number, reason, restock, when in plan:
        sale = sales[label]
        product_id = products[product_number].product_id
        line = next(item for item in sale.items if item.product_id == product_id)
        result = create_return(
            db,
            sale.sale_id,
            SaleReturnCreate(
                reason=reason,
                items=[ReturnLineIn(sale_item_id=line.sale_item_id, quantity=D("1"), restock=restock)],
                refund_method="cash",
            ),
            user_id=admin.user_id,
        )
        db.get(SaleReturn, result.sale_return_id).created_at = when
        db.commit()
    return len(plan)


def seed_held_bill(db: Session, admin: User, customers: dict[str, Customer], products: list[Product]) -> None:
    """A paused bill, so "Held bills" on the POS screen has something to resume."""
    held = HeldCart(cashier_id=admin.user_id, customer_id=customers["D"].customer_id, note="Demo: customer will come back")
    db.add(held)
    db.flush()
    db.add_all([
        HeldCartItem(held_cart_id=held.held_cart_id, product_id=products[4].product_id, quantity=D("1")),
        HeldCartItem(held_cart_id=held.held_cart_id, product_id=products[5].product_id, quantity=D("2")),
    ])
    db.commit()


def main() -> None:
    with SessionLocal() as db:
        if db.scalar(select(Customer).where(Customer.phone.in_(DEMO_PHONES))) is not None:
            print("Demo data already exists (the demo customers were found). Nothing was changed.")
            return
        admin = db.scalar(select(User).where(User.username == settings.first_admin_username))
        if admin is None:
            sys.exit("The admin user was not found. Run python -m app.init_db first.")
        products = pick_products(db)

        try:
            customers = seed_customers(db)
            sales = seed_sales(db, admin, customers, products)
            payments = seed_due_payments(db, admin, customers)
            returns = seed_returns(db, admin, sales, products)
            seed_held_bill(db, admin, customers, products)
        except Exception:
            db.rollback()
            print(
                "The demo seed stopped part-way, so some demo data may exist. To start clean, run:\n"
                "    python -m app.init_db --reset\n"
                "    python -m app.seed_products\n"
                "    python -m app.seed_demo"
            )
            raise

    print(
        f"Demo data ready: {len(customers)} customers, {len(sales)} sales, {payments} due payments, "
        f"{returns} returns and 1 held bill."
    )


if __name__ == "__main__":
    main()
