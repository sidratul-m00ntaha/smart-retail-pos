"""SaleItems.product_id and HeldCartItems.product_id are real foreign keys to Products (not plain INT columns).

Uses its own throwaway in-memory database with foreign-key checking switched on (SQLite has it off by
default; SQL Server always enforces it), so this test would fail if the column were ever loosened back to
a plain INT. Never touches your Docker database.

Run from the backend folder:  python -m unittest tests.test_product_foreign_key -v
"""
import unittest
import warnings
from datetime import datetime, timezone
from decimal import Decimal as D

from sqlalchemy import create_engine, event
from sqlalchemy.dialects.mssql import DATETIME2
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base
import app.models  # noqa: F401  (registers every table)
from app.models import Category, Product, Role, Unit, User
from app.models.sale import HeldCart, HeldCartItem, Sale, SaleItem

warnings.filterwarnings("ignore", message=".*does \\*not\\* support Decimal.*")  # SQLite only; SQL Server is exact


@compiles(DATETIME2, "sqlite")
def _datetime2_on_sqlite(type_, compiler, **kw):
    """The project's tables use SQL Server's DATETIME2; the throwaway SQLite test database stores it as DATETIME."""
    return "DATETIME"


def make_strict_session():
    engine = create_engine("sqlite://", poolclass=StaticPool, connect_args={"check_same_thread": False})

    @event.listens_for(engine, "connect")
    def _setup(dbapi_connection, _record):
        dbapi_connection.execute("PRAGMA foreign_keys=ON")  # off by default in SQLite; always on in SQL Server
        dbapi_connection.create_function(
            "sysutcdatetime", 0, lambda: datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S.%f")
        )

    Base.metadata.create_all(engine)
    db = sessionmaker(engine)()
    role = Role(name="Cashier")
    db.add(role)
    db.flush()
    db.add(User(full_name="Rina", username="rina", email="rina@example.com", password_hash="x", role_id=role.role_id))
    db.add_all([Category(name="Sample"), Unit(name="Piece")])
    db.commit()
    return db


def add_product(db) -> Product:
    category = db.query(Category).one()
    unit = db.query(Unit).one()
    product = Product(product_code="MLK-001", name="Milk 1L", category_id=category.category_id, unit_id=unit.unit_id, sale_price=D("90.00"), current_quantity=10)
    db.add(product)
    db.commit()
    return product


class ProductForeignKeyTests(unittest.TestCase):
    def setUp(self):
        self.db = make_strict_session()
        self.user = self.db.query(User).one()

    def tearDown(self):
        engine = self.db.get_bind()
        self.db.close()
        engine.dispose()

    def test_sale_item_accepts_a_real_product_and_rejects_an_unknown_one(self):
        product = add_product(self.db)
        sale = Sale(cashier_id=self.user.user_id, subtotal=D("90.00"), total_amount=D("90.00"), payment_status="PAID")
        self.db.add(sale)
        self.db.flush()

        self.db.add(SaleItem(sale_id=sale.sale_id, product_id=product.product_id, product_name="Milk 1L", quantity=D("1"), unit_price=D("90.00"), line_subtotal=D("90.00"), line_total=D("90.00")))
        self.db.commit()  # a real product_id saves fine

        self.db.add(SaleItem(sale_id=sale.sale_id, product_id=999999, product_name="Ghost", quantity=D("1"), unit_price=D("1.00"), line_subtotal=D("1.00"), line_total=D("1.00")))
        with self.assertRaises(IntegrityError):
            self.db.commit()
        self.db.rollback()

    def test_held_cart_item_accepts_a_real_product_and_rejects_an_unknown_one(self):
        product = add_product(self.db)
        cart = HeldCart(cashier_id=self.user.user_id)
        self.db.add(cart)
        self.db.flush()

        self.db.add(HeldCartItem(held_cart_id=cart.held_cart_id, product_id=product.product_id, quantity=D("1")))
        self.db.commit()  # a real product_id saves fine

        self.db.add(HeldCartItem(held_cart_id=cart.held_cart_id, product_id=999999, quantity=D("1")))
        with self.assertRaises(IntegrityError):
            self.db.commit()
        self.db.rollback()

    def test_a_product_referenced_by_a_sale_cannot_be_deleted(self):
        """Protects sale history from being orphaned; the team convention is to deactivate instead (is_active = 0)."""
        product = add_product(self.db)
        sale = Sale(cashier_id=self.user.user_id, subtotal=D("90.00"), total_amount=D("90.00"), payment_status="PAID")
        self.db.add(sale)
        self.db.flush()
        self.db.add(SaleItem(sale_id=sale.sale_id, product_id=product.product_id, product_name="Milk 1L", quantity=D("1"), unit_price=D("90.00"), line_subtotal=D("90.00"), line_total=D("90.00")))
        self.db.commit()

        self.db.delete(product)
        with self.assertRaises(IntegrityError):
            self.db.commit()
        self.db.rollback()


if __name__ == "__main__":
    unittest.main()
