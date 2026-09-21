"""Tests for the complete-sale transaction. They use a throwaway in-memory database, never your Docker one.

Run from the backend folder:  python -m unittest tests.test_complete_sale -v
"""
import unittest
import warnings
from datetime import datetime, timezone
from decimal import Decimal as D

from fastapi import HTTPException
from sqlalchemy import create_engine, event, func, select
from sqlalchemy.dialects.mssql import DATETIME2
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base
import app.models  # noqa: F401  (registers every table)
from app.models import ActivityLog, Category, Product, StoreSetting, TaxRate, Unit
from app.models.customer import Customer, LoyaltyTier
from app.models.sale import HeldCart, Invoice, Payment, Sale, SaleItem
from app.models.stock import ProductStock, StockMovement
from app.schemas.sale import PaymentIn, SaleCreate, SaleLineIn
from app.services.sale_service import complete_sale

warnings.filterwarnings("ignore", message=".*does \\*not\\* support Decimal.*")  # SQLite only; SQL Server is exact


@compiles(DATETIME2, "sqlite")
def _datetime2_on_sqlite(type_, compiler, **kw):
    """The project's tables use SQL Server's DATETIME2; the throwaway SQLite test database stores it as DATETIME."""
    return "DATETIME"


def add_sample_products(db) -> None:
    """The products the tests sell, as real Product rows. Their ids follow insertion order: 1 Milk, 2 Rice, 3 Soap.
    They start with current_quantity 0; each test adds the stock it needs (a ProductStock row, or a quantity)."""
    # like init_db, plus an address and phone so the invoice header can be checked
    db.add(StoreSetting(store_setting_id=1, store_name="Smart Retail Store", address="12 Market Road, Dhaka", phone="01700000000", currency_code="BDT", invoice_prefix="INV"))
    category, unit = Category(name="Sample"), Unit(name="Piece")
    rates = {"5.00": TaxRate(name="VAT 5%", rate_percent=D("5.00")), "0.00": TaxRate(name="Zero VAT", rate_percent=D("0.00")), "15.00": TaxRate(name="VAT 15%", rate_percent=D("15.00"))}
    db.add_all([category, unit, *rates.values()])
    db.flush()
    for code, name, price, rate in (("MLK-001", "Milk 1L", "90.00", "5.00"), ("RCE-005", "Rice 5kg", "450.00", "0.00"), ("SOP-001", "Soap", "35.50", "15.00")):
        db.add(Product(product_code=code, name=name, category_id=category.category_id, unit_id=unit.unit_id, tax_rate_id=rates[rate].tax_rate_id,
                       sale_price=D(price), tax_percent=D(rate), current_quantity=0))
        db.flush()
    db.commit()


def make_session():
    engine = create_engine("sqlite://", poolclass=StaticPool, connect_args={"check_same_thread": False})

    @event.listens_for(engine, "connect")
    def _sql_server_functions(dbapi_connection, _record):
        dbapi_connection.create_function(
            "sysutcdatetime", 0, lambda: datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S.%f")
        )

    Base.metadata.create_all(engine)
    db = sessionmaker(engine)()
    add_sample_products(db)
    return db


def line(product_id: int, quantity: str) -> SaleLineIn:
    return SaleLineIn(product_id=product_id, quantity=D(quantity))


def cash(amount: str) -> PaymentIn:
    return PaymentIn(method="cash", amount=D(amount))


class CompleteSaleTests(unittest.TestCase):
    def setUp(self):
        self.db = make_session()
        # Sample products 1 (Milk 90.00, VAT 5%), 2 (Rice 450.00, VAT 0%), 3 (Soap 35.50, VAT 15%), 10 in stock each
        self.db.add_all([ProductStock(product_id=pid, current_stock=10) for pid in (1, 2, 3)])
        self.db.commit()

    def tearDown(self):
        engine = self.db.get_bind()
        self.db.close()
        engine.dispose()

    def count(self, model) -> int:
        return self.db.scalar(select(func.count()).select_from(model))

    def stock(self, product_id: int) -> int:
        self.db.expire_all()
        return self.db.scalar(select(ProductStock.current_stock).where(ProductStock.product_id == product_id))

    def add_customer(self, credit_limit="0", due="0", tier: LoyaltyTier | None = None) -> Customer:
        customer = Customer(
            name="Test Customer", phone="0170000000", credit_limit=D(credit_limit), outstanding_due=D(due),
            loyalty_points=0, loyalty_tier_id=tier.loyalty_tier_id if tier else None,
        )
        self.db.add(customer)
        self.db.commit()
        return customer

    def assert_nothing_saved(self):
        for model in (Sale, SaleItem, Payment, Invoice, StockMovement, ActivityLog):
            self.assertEqual(self.count(model), 0, model.__name__)

    def test_guest_cash_sale_saves_everything(self):
        result = complete_sale(self.db, SaleCreate(items=[line(1, "2")], payments=[cash("189.00")]), cashier_id=1)
        sale = result.sale
        self.assertEqual((sale.subtotal, sale.tax_amount, sale.total_amount), (D("180.00"), D("9.00"), D("189.00")))
        self.assertEqual((sale.paid_amount, sale.due_amount, sale.payment_status), (D("189.00"), D("0.00"), "PAID"))
        self.assertEqual(sale.invoice_number, f"INV-{datetime.now(timezone.utc).year}-{sale.sale_id:05d}")
        self.assertEqual((self.count(Sale), self.count(SaleItem), self.count(Payment), self.count(Invoice)), (1, 1, 1, 1))
        self.assertEqual(self.stock(1), 8)
        movement = self.db.scalars(select(StockMovement)).one()
        self.assertEqual((movement.movement_type, movement.source, movement.reference_id), ("out", "sale", sale.sale_id))
        self.assertEqual(self.count(ActivityLog), 1)
        self.assertIsNone(result.customer_phone)

    def test_duplicate_lines_are_merged(self):
        result = complete_sale(self.db, SaleCreate(items=[line(1, "1"), line(1, "2")], payments=[cash("283.50")]), cashier_id=1)
        self.assertEqual(len(result.sale.items), 1)
        self.assertEqual(result.sale.items[0].quantity, D("3"))
        self.assertEqual(self.stock(1), 7)

    def test_loyalty_discount_is_applied_before_vat(self):
        tier = LoyaltyTier(name="Gold", required_points=500, discount_percent=D("10.00"))
        self.db.add(tier)
        self.db.commit()
        customer = self.add_customer(tier=tier)
        result = complete_sale(
            self.db, SaleCreate(customer_id=customer.customer_id, items=[line(1, "2")], payments=[cash("170.10")]), cashier_id=1
        )
        sale = result.sale
        self.assertEqual((sale.discount_percent, sale.discount_amount, sale.tax_amount), (D("10.00"), D("18.00"), D("8.10")))
        self.assertEqual(sale.total_amount, D("170.10"))  # 180 - 18 = 162, plus 5% VAT = 8.10
        self.assertEqual(result.customer_phone, "0170000000")

    def test_partial_payment_adds_due_and_points_only_for_the_paid_part(self):
        self.db.add(LoyaltyTier(name="Regular", required_points=0, discount_percent=D("0.00")))
        self.db.commit()
        customer = self.add_customer(credit_limit="500", due="100")
        result = complete_sale(
            self.db, SaleCreate(customer_id=customer.customer_id, items=[line(1, "2")], payments=[cash("100.00")]), cashier_id=1
        )
        self.assertEqual((result.sale.paid_amount, result.sale.due_amount, result.sale.payment_status), (D("100.00"), D("89.00"), "PARTIALLY_PAID"))
        self.db.refresh(customer)
        self.assertEqual(customer.outstanding_due, D("189.00"))  # 100 before + 89 from this sale
        self.assertEqual(customer.loyalty_points, 1)  # 1 point per 100 paid, none for the due part

    def test_everything_on_due(self):
        customer = self.add_customer(credit_limit="1000")
        result = complete_sale(self.db, SaleCreate(customer_id=customer.customer_id, items=[line(1, "2")]), cashier_id=1)
        self.assertEqual((result.sale.paid_amount, result.sale.due_amount, result.sale.payment_status), (D("0.00"), D("189.00"), "DUE"))
        self.assertEqual(self.count(Payment), 0)
        self.db.refresh(customer)
        self.assertEqual((customer.outstanding_due, customer.loyalty_points), (D("189.00"), 0))

    def test_credit_limit_exceeded_saves_nothing(self):
        customer = self.add_customer(credit_limit="50")
        with self.assertRaises(HTTPException) as caught:
            complete_sale(self.db, SaleCreate(customer_id=customer.customer_id, items=[line(1, "2")], payments=[cash("100.00")]), cashier_id=1)
        self.assertEqual(caught.exception.status_code, 400)
        self.assertIn("Credit limit exceeded", caught.exception.detail)
        self.assert_nothing_saved()
        self.assertEqual(self.stock(1), 10)

    def test_guest_cannot_buy_on_due(self):
        with self.assertRaises(HTTPException) as caught:
            complete_sale(self.db, SaleCreate(items=[line(1, "2")], payments=[cash("100.00")]), cashier_id=1)
        self.assertEqual(caught.exception.status_code, 400)
        self.assert_nothing_saved()

    def test_not_enough_stock_undoes_the_whole_sale(self):
        customer = self.add_customer(credit_limit="100000")
        with self.assertRaises(HTTPException) as caught:
            # product 1 is fine, product 2 is short: product 1's stock must NOT stay reduced
            complete_sale(self.db, SaleCreate(customer_id=customer.customer_id, items=[line(1, "2"), line(2, "11")]), cashier_id=1)
        self.assertEqual(caught.exception.status_code, 409)
        self.assert_nothing_saved()
        self.assertEqual((self.stock(1), self.stock(2)), (10, 10))
        self.db.refresh(customer)
        self.assertEqual(customer.outstanding_due, D("0.00"))

    def test_bad_requests_are_rejected(self):
        for items, code in (([line(99, "1")], 404), ([line(1, "1.5")], 400)):
            with self.assertRaises(HTTPException) as caught:
                complete_sale(self.db, SaleCreate(items=items, payments=[cash("999.00")]), cashier_id=1)
            self.assertEqual(caught.exception.status_code, code)
        self.assert_nothing_saved()

    def test_resumed_bill_is_completed_once(self):
        held = HeldCart(cashier_id=1)
        self.db.add(held)
        self.db.commit()
        request = SaleCreate(items=[line(1, "1")], payments=[cash("94.50")], held_cart_id=held.held_cart_id)
        complete_sale(self.db, request, cashier_id=1)
        self.db.refresh(held)
        self.assertEqual(held.status, "completed")
        with self.assertRaises(HTTPException) as caught:
            complete_sale(self.db, request, cashier_id=1)
        self.assertEqual(caught.exception.status_code, 409)
        self.assertEqual((self.count(Sale), self.stock(1)), (1, 9))


if __name__ == "__main__":
    unittest.main()
