# """Tests for suppliers, purchases and supplier payments. They use a throwaway in-memory database, never your Docker one.

# Run from the backend folder:  python -m unittest tests.test_purchases -v
# """
# import unittest
# import warnings
# from datetime import date, datetime, timedelta, timezone
# from decimal import Decimal as D
# from types import SimpleNamespace

# from fastapi import HTTPException
# from sqlalchemy import create_engine, event, func, select
# from sqlalchemy.dialects.mssql import DATETIME2
# from sqlalchemy.ext.compiler import compiles
# from sqlalchemy.orm import sessionmaker
# from sqlalchemy.pool import StaticPool

# from app.database import Base
# import app.models  # noqa: F401  (registers every table)
# from app.models import (
#     ActivityLog,
#     Product,
#     ProductStock,
#     Purchase,
#     PurchaseItem,
#     StockBatch,
#     StockMovement,
#     Supplier,
#     SupplierPayment,
#     TaxRate,
# )
# from app.schemas.purchase import PurchaseCreate, PurchaseItemIn
# from app.schemas.supplier import SupplierCreate, SupplierUpdate
# from app.schemas.supplier_payment import SupplierPaymentCreate
# from app.services import purchase_service, supplier_payment_service, supplier_service

# warnings.filterwarnings("ignore", message=".*does \\*not\\* support Decimal.*")  # SQLite only; SQL Server is exact

# MANAGER = SimpleNamespace(user_id=1)


# @compiles(DATETIME2, "sqlite")
# def _datetime2_on_sqlite(type_, compiler, **kw):
#     """The project's tables use SQL Server's DATETIME2; the throwaway SQLite test database stores it as DATETIME."""
#     return "DATETIME"


# def make_session():
#     engine = create_engine("sqlite://", poolclass=StaticPool, connect_args={"check_same_thread": False})

#     @event.listens_for(engine, "connect")
#     def _sql_server_functions(dbapi_connection, _record):
#         dbapi_connection.create_function(
#             "sysutcdatetime", 0, lambda: datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S.%f")
#         )

#     Base.metadata.create_all(engine)
#     return sessionmaker(engine)()


# def item(product: Product, qty: str = "1", price: str = "100.00", discount: str = "0", **extra) -> PurchaseItemIn:
#     return PurchaseItemIn(
#         product_id=product.product_id, quantity=D(qty), unit_price=D(price), line_discount_percent=D(discount), **extra
#     )


# def make_product(code: str, name: str, **extra) -> Product:
#     values = dict(
#         product_code=code, name=name, category_id=1, unit_id=1, purchase_price=D("100"), sale_price=D("120"),
#         tax_percent=D("0"), reorder_level=0, current_quantity=0, expiry_tracking=False, status="active",
#     )
#     values.update(extra)
#     return Product(**values)


# class PurchaseTestCase(unittest.TestCase):
#     def setUp(self):
#         self.db = make_session()
#         self.rice = make_product("PRD-1", "Rice 5kg")
#         self.sugar = make_product("PRD-2", "Sugar 1kg")
#         self.milk = make_product("PRD-3", "Milk 1L", expiry_tracking=True)
#         self.retired = make_product("PRD-4", "Old soap", status="inactive")
#         self.abc = Supplier(name="ABC Traders", phone="01711-000111", status="active")
#         self.other = Supplier(name="Rupchanda", phone="01812-222333", status="active")
#         self.gone = Supplier(name="Closed Co", phone="01911-444555", status="inactive")
#         self.vat = TaxRate(name="Standard VAT", rate_percent=D("15.00"), status="active")
#         self.old_vat = TaxRate(name="Old VAT", rate_percent=D("7.50"), status="inactive")
#         self.db.add_all([self.rice, self.sugar, self.milk, self.retired, self.abc, self.other, self.gone, self.vat, self.old_vat])
#         self.db.commit()

#     def tearDown(self):
#         engine = self.db.get_bind()
#         self.db.close()
#         engine.dispose()

#     # ---- helpers ----
#     def count(self, model) -> int:
#         return self.db.scalar(select(func.count()).select_from(model))

#     def stock(self, product: Product) -> int:
#         self.db.expire_all()
#         return self.db.scalar(select(ProductStock.current_stock).where(ProductStock.product_id == product.product_id)) or 0

#     def confirm(self, supplier: Supplier, items: list[PurchaseItemIn], **extra) -> Purchase:
#         purchase = purchase_service.create_purchase(
#             self.db, PurchaseCreate(supplier_id=supplier.supplier_id, items=items, **extra), MANAGER
#         )
#         self.db.commit()  # the router does this
#         return purchase

#     def pay(self, supplier: Supplier, amount: str, purchase: Purchase | None = None, method: str = "cash"):
#         payment = supplier_payment_service.create_payment(
#             self.db,
#             SupplierPaymentCreate(
#                 supplier_id=supplier.supplier_id, amount=D(amount), method=method,
#                 purchase_id=purchase.purchase_id if purchase else None,
#             ),
#             MANAGER,
#         )
#         self.db.commit()
#         return payment

#     def error_code(self, function, *args, **kwargs) -> int:
#         """Runs a call that must be refused, then undoes anything it left behind (the router would do this)."""
#         with self.assertRaises(HTTPException) as caught:
#             function(*args, **kwargs)
#         self.db.rollback()
#         return caught.exception.status_code

#     def create(self, data: PurchaseCreate) -> int:
#         return self.error_code(purchase_service.create_purchase, self.db, data, MANAGER)

#     def assert_nothing_saved(self):
#         for model in (Purchase, PurchaseItem, SupplierPayment, StockMovement, StockBatch, ActivityLog):
#             self.assertEqual(self.count(model), 0, model.__name__)


# class ConfirmPurchaseTests(PurchaseTestCase):
#     def test_confirming_saves_everything_and_increases_stock(self):
#         purchase = self.confirm(
#             self.abc,
#             [item(self.rice, "10", "100.00"), item(self.sugar, "5", "40.00", "10")],
#             discount_amount=D("80.00"), tax_rate_id=self.vat.tax_rate_id, shipping_charge=D("50.00"),
#             paid_amount=D("1000.00"), payment_method="cash", note="  first delivery  ",
#         )
#         # PRD 5.6: 1000 + 180 = 1180; VAT 15% of 1180 = 177; 1180 - 80 + 177 + 50 = 1327
#         self.assertEqual(purchase.purchase_number, f"PUR-{datetime.now(timezone.utc).year}-{purchase.purchase_id:05d}")
#         self.assertEqual(
#             (purchase.subtotal, purchase.discount_amount, purchase.tax_percent, purchase.tax_amount, purchase.shipping_charge),
#             (D("1180.00"), D("80.00"), D("15.00"), D("177.00"), D("50.00")),
#         )
#         self.assertEqual(
#             (purchase.total_amount, purchase.paid_amount, purchase.due_amount, purchase.payment_status, purchase.note),
#             (D("1327.00"), D("1000.00"), D("327.00"), "PARTIALLY_PAID", "first delivery"),
#         )
#         lines = list(self.db.scalars(select(PurchaseItem).order_by(PurchaseItem.purchase_item_id)))
#         self.assertEqual([(l.product_name, l.line_total) for l in lines], [("Rice 5kg", D("1000.00")), ("Sugar 1kg", D("180.00"))])

#         # stock went up by exactly the purchased quantity, and Products mirrors it
#         self.assertEqual((self.stock(self.rice), self.stock(self.sugar)), (10, 5))
#         self.assertEqual((self.rice.current_quantity, self.sugar.current_quantity), (10, 5))
#         movements = list(self.db.scalars(select(StockMovement)))
#         self.assertEqual(len(movements), 2)
#         for movement in movements:
#             self.assertEqual((movement.movement_type, movement.source, movement.reference_id), ("in", "purchase", purchase.purchase_id))

#         payment = self.db.scalars(select(SupplierPayment)).one()
#         self.assertEqual((payment.supplier_id, payment.purchase_id, payment.amount, payment.method), (self.abc.supplier_id, purchase.purchase_id, D("1000.00"), "cash"))
#         log = self.db.scalars(select(ActivityLog)).one()
#         self.assertEqual((log.action, log.entity, log.reference), ("CREATE", "Purchase", purchase.purchase_number))

#     def test_unpaid_purchase_is_all_due_and_has_no_payment(self):
#         purchase = self.confirm(self.abc, [item(self.rice, "3")])
#         self.assertEqual((purchase.paid_amount, purchase.due_amount, purchase.payment_status), (D("0.00"), D("300.00"), "DUE"))
#         self.assertEqual(self.count(SupplierPayment), 0)

#     def test_supplier_totals_follow_the_purchases(self):
#         self.confirm(self.abc, [item(self.rice, "3")], paid_amount=D("100.00"), payment_method="digital")
#         self.confirm(self.abc, [item(self.sugar, "2")])
#         out = supplier_service.get_supplier_out(self.db, self.abc.supplier_id)
#         self.assertEqual(
#             (out.purchase_count, out.total_purchases, out.total_paid, out.outstanding_due),
#             (2, D("500.00"), D("100.00"), D("400.00")),
#         )
#         self.assertEqual(supplier_service.get_supplier_out(self.db, self.other.supplier_id).outstanding_due, D("0.00"))

#     def test_supplier_must_exist_and_be_active(self):
#         base = dict(items=[item(self.rice)])
#         self.assertEqual(self.create(PurchaseCreate(supplier_id=self.gone.supplier_id, **base)), 400)
#         self.assertEqual(self.create(PurchaseCreate(supplier_id=999, **base)), 404)
#         self.assert_nothing_saved()

#     def test_products_must_exist_be_active_and_whole_quantities(self):
#         sid = self.abc.supplier_id
#         self.assertEqual(self.create(PurchaseCreate(supplier_id=sid, items=[item(self.retired)])), 400)
#         self.assertEqual(self.create(PurchaseCreate(supplier_id=sid, items=[PurchaseItemIn(product_id=999, quantity=D("1"), unit_price=D("10"))])), 404)
#         self.assertEqual(self.create(PurchaseCreate(supplier_id=sid, items=[item(self.rice, "1.5")])), 400)
#         self.assert_nothing_saved()

#     def test_payment_and_vat_rules(self):
#         sid, lines = self.abc.supplier_id, [item(self.rice, "1", "100.00")]
#         self.assertEqual(self.create(PurchaseCreate(supplier_id=sid, items=lines, paid_amount=D("100.01"), payment_method="cash")), 400)  # more than total
#         self.assertEqual(self.create(PurchaseCreate(supplier_id=sid, items=lines, paid_amount=D("50.00"))), 400)  # no method
#         self.assertEqual(self.create(PurchaseCreate(supplier_id=sid, items=lines, discount_amount=D("100.01"))), 400)  # discount > subtotal
#         self.assertEqual(self.create(PurchaseCreate(supplier_id=sid, items=lines, tax_rate_id=self.old_vat.tax_rate_id)), 400)  # inactive rate
#         self.assertEqual(self.create(PurchaseCreate(supplier_id=sid, items=lines, tax_rate_id=999)), 400)
#         self.assert_nothing_saved()

#     def test_a_bad_second_line_leaves_the_first_line_unsaved(self):
#         code = self.create(PurchaseCreate(supplier_id=self.abc.supplier_id, items=[item(self.rice, "10"), item(self.retired)]))
#         self.assertEqual(code, 400)
#         self.assertEqual(self.stock(self.rice), 0)
#         self.assert_nothing_saved()

#     def test_the_schema_refuses_bad_amounts(self):
#         with self.assertRaises(ValueError):
#             PurchaseCreate(supplier_id=1, items=[item(self.rice)], paid_amount=D("-1"))
#         with self.assertRaises(ValueError):
#             PurchaseCreate(supplier_id=1, items=[])
#         with self.assertRaises(ValueError):
#             item(self.rice, price="0")
#         with self.assertRaises(ValueError):
#             item(self.rice, discount="101")


# class ExpiryTests(PurchaseTestCase):
#     def test_expiry_products_need_a_batch_and_a_future_date(self):
#         sid, soon = self.abc.supplier_id, date.today() + timedelta(days=30)
#         self.assertEqual(self.create(PurchaseCreate(supplier_id=sid, items=[item(self.milk, "10")])), 400)
#         self.assertEqual(self.create(PurchaseCreate(supplier_id=sid, items=[item(self.milk, "10", batch_number="B-1")])), 400)
#         self.assertEqual(self.create(PurchaseCreate(supplier_id=sid, items=[item(self.milk, "10", expiry_date=soon)])), 400)
#         past = date.today() - timedelta(days=1)
#         self.assertEqual(self.create(PurchaseCreate(supplier_id=sid, items=[item(self.milk, "10", batch_number="B-1", expiry_date=past)])), 400)
#         self.assert_nothing_saved()

#     def test_the_batch_is_saved_and_stock_is_counted_once(self):
#         soon = date.today() + timedelta(days=30)
#         purchase = self.confirm(self.abc, [item(self.milk, "10", batch_number=" B-1 ", expiry_date=soon)])
#         batch = self.db.scalars(select(StockBatch)).one()
#         self.assertEqual((batch.product_id, batch.batch_number, batch.quantity, batch.expiry_date), (self.milk.product_id, "B-1", 10, soon))
#         self.assertEqual(self.stock(self.milk), 10)  # not 20: the batch must not add the stock a second time
#         line = self.db.scalars(select(PurchaseItem)).one()
#         self.assertEqual((line.purchase_id, line.batch_number, line.expiry_date), (purchase.purchase_id, "B-1", soon))
#         self.assertEqual(self.db.scalars(select(StockMovement)).one().source, "purchase")

#     def test_batch_details_are_ignored_for_products_without_expiry_tracking(self):
#         self.confirm(self.abc, [item(self.rice, "4", batch_number="X", expiry_date=date.today() + timedelta(days=5))])
#         self.assertEqual(self.count(StockBatch), 0)
#         self.assertIsNone(self.db.scalars(select(PurchaseItem)).one().batch_number)


# class PayingSuppliersTests(PurchaseTestCase):
#     def setUp(self):
#         super().setUp()
#         self.first = self.confirm(self.abc, [item(self.rice, "3")])   # 300.00 due, the oldest
#         self.second = self.confirm(self.abc, [item(self.rice, "2")])  # 200.00 due

#     def purchase(self, purchase: Purchase) -> Purchase:
#         self.db.expire_all()
#         return self.db.get(Purchase, purchase.purchase_id)

#     def outstanding(self, supplier: Supplier) -> D:
#         return supplier_service.get_supplier_out(self.db, supplier.supplier_id).outstanding_due

#     def test_a_payment_reduces_the_due_by_exactly_the_amount_oldest_purchase_first(self):
#         self.assertEqual(self.outstanding(self.abc), D("500.00"))
#         payment = self.pay(self.abc, "350.00", method="bank")
#         first, second = self.purchase(self.first), self.purchase(self.second)
#         self.assertEqual((first.due_amount, first.paid_amount, first.payment_status), (D("0.00"), D("300.00"), "PAID"))
#         self.assertEqual((second.due_amount, second.paid_amount, second.payment_status), (D("150.00"), D("50.00"), "PARTIALLY_PAID"))
#         self.assertEqual(self.outstanding(self.abc), D("150.00"))
#         self.assertEqual((payment.amount, payment.method, payment.purchase_id), (D("350.00"), "bank", None))
#         log = self.db.scalars(select(ActivityLog).where(ActivityLog.action == "PAYMENT")).one()
#         self.assertEqual((log.entity, log.reference), ("Supplier", "ABC Traders"))

#     def test_a_payment_can_target_one_purchase(self):
#         payment = self.pay(self.abc, "200.00", purchase=self.second)
#         self.assertEqual(self.purchase(self.second).payment_status, "PAID")
#         self.assertEqual((self.purchase(self.first).due_amount, self.purchase(self.first).payment_status), (D("300.00"), "DUE"))
#         self.assertEqual(payment.purchase_id, self.second.purchase_id)
#         self.assertEqual(self.outstanding(self.abc), D("300.00"))

#     def test_payments_can_never_be_more_than_what_is_due(self):
#         def attempt(amount, purchase=None, supplier=None):
#             data = SupplierPaymentCreate(
#                 supplier_id=(supplier or self.abc).supplier_id, amount=D(amount), method="cash",
#                 purchase_id=purchase.purchase_id if purchase else None,
#             )
#             return self.error_code(supplier_payment_service.create_payment, self.db, data, MANAGER)

#         self.assertEqual(attempt("500.01"), 400)  # more than the supplier's due
#         self.assertEqual(attempt("200.01", purchase=self.second), 400)  # more than that purchase's due
#         self.assertEqual(attempt("10.00", supplier=self.other), 400)  # this supplier owes nothing
#         self.assertEqual(attempt("10.00", purchase=self.first, supplier=self.other), 400)  # not this supplier's purchase
#         self.assertEqual(attempt("10.00", supplier=Supplier(supplier_id=999, name="x", phone="1")), 404)
#         self.assertEqual(self.outstanding(self.abc), D("500.00"))
#         with self.assertRaises(ValueError):
#             SupplierPaymentCreate(supplier_id=1, amount=D("0"), method="cash")
#         with self.assertRaises(ValueError):
#             SupplierPaymentCreate(supplier_id=1, amount=D("5"), method="cheque")  # type: ignore[arg-type]

#     def test_an_inactive_supplier_can_still_be_paid(self):
#         purchase = self.confirm(self.abc, [item(self.sugar, "1")])
#         self.db.get(Supplier, self.abc.supplier_id).status = "inactive"
#         self.db.commit()
#         self.pay(self.abc, "100.00", purchase=purchase)
#         self.assertEqual(self.purchase(purchase).payment_status, "PAID")

#     def test_payments_always_add_up_to_what_the_purchases_say_was_paid(self):
#         paid_now = self.confirm(self.abc, [item(self.sugar, "2")], paid_amount=D("120.00"), payment_method="cash")
#         self.pay(self.abc, "75.50")
#         self.pay(self.abc, "44.50", purchase=paid_now)
#         self.db.expire_all()
#         payments = self.db.scalar(select(func.sum(SupplierPayment.amount)))
#         paid_on_purchases = self.db.scalar(select(func.sum(Purchase.paid_amount)))
#         self.assertEqual(D(str(payments)), D(str(paid_on_purchases)))
#         out = supplier_service.get_supplier_out(self.db, self.abc.supplier_id)
#         self.assertEqual(out.total_paid, D("240.00"))
#         self.assertEqual(out.total_purchases - out.total_paid, out.outstanding_due)

#     def test_payment_history_lists_newest_first_and_can_be_searched(self):
#         self.pay(self.abc, "50.00")
#         self.pay(self.abc, "25.00", purchase=self.second)
#         history = supplier_payment_service.list_payments(self.db)
#         self.assertEqual([p.amount for p in history], [D("25.00"), D("50.00")])
#         self.assertEqual(history[0].purchase_number, self.second.purchase_number)
#         self.assertEqual(len(supplier_payment_service.list_payments(self.db, search="abc")), 2)
#         self.assertEqual(supplier_payment_service.list_payments(self.db, search="nobody"), [])
#         self.assertEqual(len(supplier_payment_service.list_payments(self.db, supplier_id=self.abc.supplier_id)), 2)


# class PurchaseHistoryTests(PurchaseTestCase):
#     def test_list_search_filter_and_detail(self):
#         paid = self.confirm(self.abc, [item(self.rice, "1"), item(self.sugar, "2")], paid_amount=D("300.00"), payment_method="cash")
#         owed = self.confirm(self.other, [item(self.rice, "1")])
#         listed = purchase_service.list_purchases(self.db)
#         self.assertEqual([p.purchase_number for p in listed], [owed.purchase_number, paid.purchase_number])  # newest first
#         self.assertEqual((listed[1].supplier_name, listed[1].item_count), ("ABC Traders", 2))
#         self.assertEqual([p.purchase_id for p in purchase_service.list_purchases(self.db, payment_status="DUE")], [owed.purchase_id])
#         self.assertEqual([p.purchase_id for p in purchase_service.list_purchases(self.db, supplier_id=self.abc.supplier_id)], [paid.purchase_id])
#         self.assertEqual([p.purchase_id for p in purchase_service.list_purchases(self.db, search="rupchanda")], [owed.purchase_id])
#         self.assertEqual([p.purchase_id for p in purchase_service.list_purchases(self.db, search=paid.purchase_number)], [paid.purchase_id])

#         detail = purchase_service.get_purchase_out(self.db, paid.purchase_id)
#         self.assertEqual([(i.product_name, i.quantity) for i in detail.items], [("Rice 5kg", D("1")), ("Sugar 1kg", D("2"))])
#         self.assertEqual(self.error_code(purchase_service.get_purchase_out, self.db, 999), 404)


# class SupplierTests(PurchaseTestCase):
#     def test_create_edit_and_deactivate(self):
#         created = supplier_service.create_supplier(
#             self.db, SupplierCreate(name="  Metro FMCG  ", phone=" 01611-666777 ", email=" INFO@Metro.com ", address="  "), MANAGER
#         )
#         self.db.commit()
#         self.assertEqual((created.name, created.phone, created.email, created.address, created.status), ("Metro FMCG", "01611-666777", "info@metro.com", None, "active"))

#         supplier_service.update_supplier(
#             self.db, created.supplier_id, SupplierUpdate(name="Metro FMCG", phone="01611-666777", email="info@metro.com", status="inactive"), MANAGER
#         )
#         self.db.commit()
#         log = self.db.scalars(select(ActivityLog).where(ActivityLog.action == "UPDATE")).one()
#         self.assertEqual((log.entity, log.reference, log.details), ("Supplier", "Metro FMCG", "Deactivated"))
#         self.assertEqual(self.db.get(Supplier, created.supplier_id).status, "inactive")

#     def test_names_must_be_unique_ignoring_case(self):
#         self.assertEqual(self.error_code(supplier_service.create_supplier, self.db, SupplierCreate(name="abc traders", phone="1"), MANAGER), 409)
#         clash = SupplierUpdate(name="RUPCHANDA", phone="1", status="active")
#         self.assertEqual(self.error_code(supplier_service.update_supplier, self.db, self.abc.supplier_id, clash, MANAGER), 409)
#         same_name = SupplierUpdate(name="ABC Traders", phone="01700-000000", status="active")  # editing keeps its own name
#         supplier_service.update_supplier(self.db, self.abc.supplier_id, same_name, MANAGER)
#         self.assertEqual(self.error_code(supplier_service.update_supplier, self.db, 999, same_name, MANAGER), 404)

#     def test_list_search_and_status_filter(self):
#         self.assertEqual([s.name for s in supplier_service.list_suppliers(self.db)], ["ABC Traders", "Closed Co", "Rupchanda"])
#         self.assertEqual([s.name for s in supplier_service.list_suppliers(self.db, status_filter="inactive")], ["Closed Co"])
#         self.assertEqual([s.name for s in supplier_service.list_suppliers(self.db, search="0181")], ["Rupchanda"])

#     def test_the_schema_checks_phone_and_email(self):
#         for bad in (dict(name="X", phone="abc"), dict(name="X", phone="1", email="not-an-email"), dict(name=" ", phone="1")):
#             with self.assertRaises(ValueError):
#                 SupplierCreate(**bad)


# if __name__ == "__main__":
#     unittest.main()













"""Tests for suppliers, purchases and supplier payments. They use a throwaway in-memory database, never your Docker one.

Run from the backend folder:  python -m unittest tests.test_purchases -v
"""
import unittest
import warnings
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal as D
from types import SimpleNamespace

from fastapi import HTTPException
from sqlalchemy import create_engine, event, func, select
from sqlalchemy.dialects.mssql import DATETIME2
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base
import app.models  # noqa: F401  (registers every table)
from app.models import (
    ActivityLog,
    Product,
    ProductStock,
    Purchase,
    PurchaseItem,
    StockBatch,
    StockMovement,
    Supplier,
    SupplierPayment,
    TaxRate,
)
from app.schemas.purchase import PurchaseCreate, PurchaseItemIn
from app.schemas.supplier import SupplierCreate, SupplierUpdate
from app.schemas.supplier_payment import SupplierPaymentCreate
from app.services import purchase_service, supplier_payment_service, supplier_service

warnings.filterwarnings("ignore", message=".*does \\*not\\* support Decimal.*")  # SQLite only; SQL Server is exact

MANAGER = SimpleNamespace(user_id=1)


@compiles(DATETIME2, "sqlite")
def _datetime2_on_sqlite(type_, compiler, **kw):
    """The project's tables use SQL Server's DATETIME2; the throwaway SQLite test database stores it as DATETIME."""
    return "DATETIME"


def make_session():
    engine = create_engine("sqlite://", poolclass=StaticPool, connect_args={"check_same_thread": False})

    @event.listens_for(engine, "connect")
    def _sql_server_functions(dbapi_connection, _record):
        dbapi_connection.create_function(
            "sysutcdatetime", 0, lambda: datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S.%f")
        )

    Base.metadata.create_all(engine)
    return sessionmaker(engine)()


def item(product: Product, qty: str = "1", price: str = "100.00", discount: str = "0", **extra) -> PurchaseItemIn:
    return PurchaseItemIn(
        product_id=product.product_id, quantity=D(qty), unit_price=D(price), line_discount_percent=D(discount), **extra
    )


def make_product(code: str, name: str, **extra) -> Product:
    values = dict(
        product_code=code, name=name, category_id=1, unit_id=1, purchase_price=D("100"), sale_price=D("120"),
        tax_percent=D("0"), reorder_level=0, current_quantity=0, expiry_tracking=False, status="active",
    )
    values.update(extra)
    return Product(**values)


class PurchaseTestCase(unittest.TestCase):
    def setUp(self):
        self.db = make_session()
        self.rice = make_product("PRD-1", "Rice 5kg")
        self.sugar = make_product("PRD-2", "Sugar 1kg")
        self.milk = make_product("PRD-3", "Milk 1L", expiry_tracking=True)
        self.retired = make_product("PRD-4", "Old soap", status="inactive")
        self.abc = Supplier(name="ABC Traders", phone="01711-000111", status="active")
        self.other = Supplier(name="Rupchanda", phone="01812-222333", status="active")
        self.gone = Supplier(name="Closed Co", phone="01911-444555", status="inactive")
        self.vat = TaxRate(name="Standard VAT", rate_percent=D("15.00"), status="active")
        self.old_vat = TaxRate(name="Old VAT", rate_percent=D("7.50"), status="inactive")
        self.db.add_all([self.rice, self.sugar, self.milk, self.retired, self.abc, self.other, self.gone, self.vat, self.old_vat])
        self.db.commit()

    def tearDown(self):
        engine = self.db.get_bind()
        self.db.close()
        engine.dispose()

    # ---- helpers ----
    def count(self, model) -> int:
        return self.db.scalar(select(func.count()).select_from(model))

    def stock(self, product: Product) -> int:
        self.db.expire_all()
        return self.db.scalar(select(ProductStock.current_stock).where(ProductStock.product_id == product.product_id)) or 0

    def confirm(self, supplier: Supplier, items: list[PurchaseItemIn], **extra) -> Purchase:
        purchase = purchase_service.create_purchase(
            self.db, PurchaseCreate(supplier_id=supplier.supplier_id, items=items, **extra), MANAGER
        )
        self.db.commit()  # the router does this
        return purchase

    def pay(self, supplier: Supplier, amount: str, purchase: Purchase | None = None, method: str = "cash"):
        payment = supplier_payment_service.create_payment(
            self.db,
            SupplierPaymentCreate(
                supplier_id=supplier.supplier_id, amount=D(amount), method=method,
                purchase_id=purchase.purchase_id if purchase else None,
            ),
            MANAGER,
        )
        self.db.commit()
        return payment

    def error_code(self, function, *args, **kwargs) -> int:
        """Runs a call that must be refused, then undoes anything it left behind (the router would do this)."""
        with self.assertRaises(HTTPException) as caught:
            function(*args, **kwargs)
        self.db.rollback()
        return caught.exception.status_code

    def create(self, data: PurchaseCreate) -> int:
        return self.error_code(purchase_service.create_purchase, self.db, data, MANAGER)

    def assert_nothing_saved(self):
        for model in (Purchase, PurchaseItem, SupplierPayment, StockMovement, StockBatch, ActivityLog):
            self.assertEqual(self.count(model), 0, model.__name__)


class ConfirmPurchaseTests(PurchaseTestCase):
    def test_confirming_saves_everything_and_increases_stock(self):
        purchase = self.confirm(
            self.abc,
            [item(self.rice, "10", "100.00"), item(self.sugar, "5", "40.00", "10")],
            discount_amount=D("80.00"), tax_rate_id=self.vat.tax_rate_id, shipping_charge=D("50.00"),
            paid_amount=D("1000.00"), payment_method="cash", note="  first delivery  ",
        )
        # PRD 5.6: 1000 + 180 = 1180; VAT 15% of 1180 = 177; 1180 - 80 + 177 + 50 = 1327
        self.assertEqual(purchase.purchase_number, f"PUR-{datetime.now(timezone.utc).year}-{purchase.purchase_id:05d}")
        self.assertEqual(
            (purchase.subtotal, purchase.discount_amount, purchase.tax_percent, purchase.tax_amount, purchase.shipping_charge),
            (D("1180.00"), D("80.00"), D("15.00"), D("177.00"), D("50.00")),
        )
        self.assertEqual(
            (purchase.total_amount, purchase.paid_amount, purchase.due_amount, purchase.payment_status, purchase.note),
            (D("1327.00"), D("1000.00"), D("327.00"), "PARTIALLY_PAID", "first delivery"),
        )
        lines = list(self.db.scalars(select(PurchaseItem).order_by(PurchaseItem.purchase_item_id)))
        self.assertEqual([(l.product_name, l.line_total) for l in lines], [("Rice 5kg", D("1000.00")), ("Sugar 1kg", D("180.00"))])

        # stock went up by exactly the purchased quantity, and Products mirrors it
        self.assertEqual((self.stock(self.rice), self.stock(self.sugar)), (10, 5))
        self.assertEqual((self.rice.current_quantity, self.sugar.current_quantity), (10, 5))
        movements = list(self.db.scalars(select(StockMovement)))
        self.assertEqual(len(movements), 2)
        for movement in movements:
            self.assertEqual((movement.movement_type, movement.source, movement.reference_id), ("in", "purchase", purchase.purchase_id))

        payment = self.db.scalars(select(SupplierPayment)).one()
        self.assertEqual((payment.supplier_id, payment.purchase_id, payment.amount, payment.method), (self.abc.supplier_id, purchase.purchase_id, D("1000.00"), "cash"))
        log = self.db.scalars(select(ActivityLog)).one()
        self.assertEqual((log.action, log.entity, log.reference), ("CREATE", "Purchase", purchase.purchase_number))

    def test_unpaid_purchase_is_all_due_and_has_no_payment(self):
        purchase = self.confirm(self.abc, [item(self.rice, "3")])
        self.assertEqual((purchase.paid_amount, purchase.due_amount, purchase.payment_status), (D("0.00"), D("300.00"), "DUE"))
        self.assertEqual(self.count(SupplierPayment), 0)

    def test_supplier_totals_follow_the_purchases(self):
        self.confirm(self.abc, [item(self.rice, "3")], paid_amount=D("100.00"), payment_method="digital")
        self.confirm(self.abc, [item(self.sugar, "2")])
        out = supplier_service.get_supplier_out(self.db, self.abc.supplier_id)
        self.assertEqual(
            (out.purchase_count, out.total_purchases, out.total_paid, out.outstanding_due),
            (2, D("500.00"), D("100.00"), D("400.00")),
        )
        self.assertEqual(supplier_service.get_supplier_out(self.db, self.other.supplier_id).outstanding_due, D("0.00"))

    def test_supplier_must_exist_and_be_active(self):
        base = dict(items=[item(self.rice)])
        self.assertEqual(self.create(PurchaseCreate(supplier_id=self.gone.supplier_id, **base)), 400)
        self.assertEqual(self.create(PurchaseCreate(supplier_id=999, **base)), 404)
        self.assert_nothing_saved()

    def test_products_must_exist_be_active_and_whole_quantities(self):
        sid = self.abc.supplier_id
        self.assertEqual(self.create(PurchaseCreate(supplier_id=sid, items=[item(self.retired)])), 400)
        self.assertEqual(self.create(PurchaseCreate(supplier_id=sid, items=[PurchaseItemIn(product_id=999, quantity=D("1"), unit_price=D("10"))])), 404)
        self.assertEqual(self.create(PurchaseCreate(supplier_id=sid, items=[item(self.rice, "1.5")])), 400)
        self.assert_nothing_saved()

    def test_payment_and_vat_rules(self):
        sid, lines = self.abc.supplier_id, [item(self.rice, "1", "100.00")]
        self.assertEqual(self.create(PurchaseCreate(supplier_id=sid, items=lines, paid_amount=D("100.01"), payment_method="cash")), 400)  # more than total
        self.assertEqual(self.create(PurchaseCreate(supplier_id=sid, items=lines, paid_amount=D("50.00"))), 400)  # no method
        self.assertEqual(self.create(PurchaseCreate(supplier_id=sid, items=lines, discount_amount=D("100.01"))), 400)  # discount > subtotal
        self.assertEqual(self.create(PurchaseCreate(supplier_id=sid, items=lines, tax_rate_id=self.old_vat.tax_rate_id)), 400)  # inactive rate
        self.assertEqual(self.create(PurchaseCreate(supplier_id=sid, items=lines, tax_rate_id=999)), 400)
        self.assert_nothing_saved()

    def test_a_bad_second_line_leaves_the_first_line_unsaved(self):
        code = self.create(PurchaseCreate(supplier_id=self.abc.supplier_id, items=[item(self.rice, "10"), item(self.retired)]))
        self.assertEqual(code, 400)
        self.assertEqual(self.stock(self.rice), 0)
        self.assert_nothing_saved()

    def test_the_schema_refuses_bad_amounts(self):
        with self.assertRaises(ValueError):
            PurchaseCreate(supplier_id=1, items=[item(self.rice)], paid_amount=D("-1"))
        with self.assertRaises(ValueError):
            PurchaseCreate(supplier_id=1, items=[])
        with self.assertRaises(ValueError):
            item(self.rice, price="0")
        with self.assertRaises(ValueError):
            item(self.rice, discount="101")


class ExpiryTests(PurchaseTestCase):
    def test_expiry_products_need_a_batch_and_a_future_date(self):
        sid, soon = self.abc.supplier_id, date.today() + timedelta(days=30)
        self.assertEqual(self.create(PurchaseCreate(supplier_id=sid, items=[item(self.milk, "10")])), 400)
        self.assertEqual(self.create(PurchaseCreate(supplier_id=sid, items=[item(self.milk, "10", batch_number="B-1")])), 400)
        self.assertEqual(self.create(PurchaseCreate(supplier_id=sid, items=[item(self.milk, "10", expiry_date=soon)])), 400)
        past = date.today() - timedelta(days=1)
        self.assertEqual(self.create(PurchaseCreate(supplier_id=sid, items=[item(self.milk, "10", batch_number="B-1", expiry_date=past)])), 400)
        self.assert_nothing_saved()

    def test_the_batch_is_saved_and_stock_is_counted_once(self):
        soon = date.today() + timedelta(days=30)
        purchase = self.confirm(self.abc, [item(self.milk, "10", batch_number=" B-1 ", expiry_date=soon)])
        batch = self.db.scalars(select(StockBatch)).one()
        self.assertEqual((batch.product_id, batch.batch_number, batch.quantity, batch.expiry_date), (self.milk.product_id, "B-1", 10, soon))
        self.assertEqual(self.stock(self.milk), 10)  # not 20: the batch must not add the stock a second time
        line = self.db.scalars(select(PurchaseItem)).one()
        self.assertEqual((line.purchase_id, line.batch_number, line.expiry_date), (purchase.purchase_id, "B-1", soon))
        self.assertEqual(self.db.scalars(select(StockMovement)).one().source, "purchase")

    def test_batch_details_are_ignored_for_products_without_expiry_tracking(self):
        self.confirm(self.abc, [item(self.rice, "4", batch_number="X", expiry_date=date.today() + timedelta(days=5))])
        self.assertEqual(self.count(StockBatch), 0)
        self.assertIsNone(self.db.scalars(select(PurchaseItem)).one().batch_number)


class PayingSuppliersTests(PurchaseTestCase):
    def setUp(self):
        super().setUp()
        self.first = self.confirm(self.abc, [item(self.rice, "3")])   # 300.00 due, the oldest
        self.second = self.confirm(self.abc, [item(self.rice, "2")])  # 200.00 due

    def purchase(self, purchase: Purchase) -> Purchase:
        self.db.expire_all()
        return self.db.get(Purchase, purchase.purchase_id)

    def outstanding(self, supplier: Supplier) -> D:
        return supplier_service.get_supplier_out(self.db, supplier.supplier_id).outstanding_due

    def test_a_payment_reduces_the_due_by_exactly_the_amount_oldest_purchase_first(self):
        self.assertEqual(self.outstanding(self.abc), D("500.00"))
        payment = self.pay(self.abc, "350.00", method="bank")
        first, second = self.purchase(self.first), self.purchase(self.second)
        self.assertEqual((first.due_amount, first.paid_amount, first.payment_status), (D("0.00"), D("300.00"), "PAID"))
        self.assertEqual((second.due_amount, second.paid_amount, second.payment_status), (D("150.00"), D("50.00"), "PARTIALLY_PAID"))
        self.assertEqual(self.outstanding(self.abc), D("150.00"))
        self.assertEqual((payment.amount, payment.method, payment.purchase_id), (D("350.00"), "bank", None))
        log = self.db.scalars(select(ActivityLog).where(ActivityLog.action == "PAYMENT")).one()
        self.assertEqual((log.entity, log.reference), ("Supplier", "ABC Traders"))

    def test_a_payment_can_target_one_purchase(self):
        payment = self.pay(self.abc, "200.00", purchase=self.second)
        self.assertEqual(self.purchase(self.second).payment_status, "PAID")
        self.assertEqual((self.purchase(self.first).due_amount, self.purchase(self.first).payment_status), (D("300.00"), "DUE"))
        self.assertEqual(payment.purchase_id, self.second.purchase_id)
        self.assertEqual(self.outstanding(self.abc), D("300.00"))

    def test_payments_can_never_be_more_than_what_is_due(self):
        def attempt(amount, purchase=None, supplier=None):
            data = SupplierPaymentCreate(
                supplier_id=(supplier or self.abc).supplier_id, amount=D(amount), method="cash",
                purchase_id=purchase.purchase_id if purchase else None,
            )
            return self.error_code(supplier_payment_service.create_payment, self.db, data, MANAGER)

        self.assertEqual(attempt("500.01"), 400)  # more than the supplier's due
        self.assertEqual(attempt("200.01", purchase=self.second), 400)  # more than that purchase's due
        self.assertEqual(attempt("10.00", supplier=self.other), 400)  # this supplier owes nothing
        self.assertEqual(attempt("10.00", purchase=self.first, supplier=self.other), 400)  # not this supplier's purchase
        self.assertEqual(attempt("10.00", supplier=Supplier(supplier_id=999, name="x", phone="1")), 404)
        self.assertEqual(self.outstanding(self.abc), D("500.00"))
        with self.assertRaises(ValueError):
            SupplierPaymentCreate(supplier_id=1, amount=D("0"), method="cash")
        with self.assertRaises(ValueError):
            SupplierPaymentCreate(supplier_id=1, amount=D("5"), method="cheque")  # type: ignore[arg-type]

    def test_an_inactive_supplier_can_still_be_paid(self):
        purchase = self.confirm(self.abc, [item(self.sugar, "1")])
        self.db.get(Supplier, self.abc.supplier_id).status = "inactive"
        self.db.commit()
        self.pay(self.abc, "100.00", purchase=purchase)
        self.assertEqual(self.purchase(purchase).payment_status, "PAID")

    def test_payments_always_add_up_to_what_the_purchases_say_was_paid(self):
        paid_now = self.confirm(self.abc, [item(self.sugar, "2")], paid_amount=D("120.00"), payment_method="cash")
        self.pay(self.abc, "75.50")
        self.pay(self.abc, "44.50", purchase=paid_now)
        self.db.expire_all()
        payments = self.db.scalar(select(func.sum(SupplierPayment.amount)))
        paid_on_purchases = self.db.scalar(select(func.sum(Purchase.paid_amount)))
        self.assertEqual(D(str(payments)), D(str(paid_on_purchases)))
        out = supplier_service.get_supplier_out(self.db, self.abc.supplier_id)
        self.assertEqual(out.total_paid, D("240.00"))
        self.assertEqual(out.total_purchases - out.total_paid, out.outstanding_due)

    def test_payment_history_lists_newest_first_and_can_be_searched(self):
        self.pay(self.abc, "50.00")
        self.pay(self.abc, "25.00", purchase=self.second)
        history = supplier_payment_service.list_payments(self.db)
        self.assertEqual([p.amount for p in history], [D("25.00"), D("50.00")])
        self.assertEqual(history[0].purchase_number, self.second.purchase_number)
        self.assertEqual(len(supplier_payment_service.list_payments(self.db, search="abc")), 2)
        self.assertEqual(supplier_payment_service.list_payments(self.db, search="nobody"), [])
        self.assertEqual(len(supplier_payment_service.list_payments(self.db, supplier_id=self.abc.supplier_id)), 2)


class PurchaseHistoryTests(PurchaseTestCase):
    def test_list_search_filter_and_detail(self):
        paid = self.confirm(self.abc, [item(self.rice, "1"), item(self.sugar, "2")], paid_amount=D("300.00"), payment_method="cash")
        owed = self.confirm(self.other, [item(self.rice, "1")])
        listed = purchase_service.list_purchases(self.db)
        self.assertEqual([p.purchase_number for p in listed], [owed.purchase_number, paid.purchase_number])  # newest first
        self.assertEqual((listed[1].supplier_name, listed[1].item_count), ("ABC Traders", 2))
        self.assertEqual([p.purchase_id for p in purchase_service.list_purchases(self.db, payment_status="DUE")], [owed.purchase_id])
        self.assertEqual([p.purchase_id for p in purchase_service.list_purchases(self.db, supplier_id=self.abc.supplier_id)], [paid.purchase_id])
        self.assertEqual([p.purchase_id for p in purchase_service.list_purchases(self.db, search="rupchanda")], [owed.purchase_id])
        self.assertEqual([p.purchase_id for p in purchase_service.list_purchases(self.db, search=paid.purchase_number)], [paid.purchase_id])

        detail = purchase_service.get_purchase_out(self.db, paid.purchase_id)
        self.assertEqual([(i.product_name, i.quantity) for i in detail.items], [("Rice 5kg", D("1")), ("Sugar 1kg", D("2"))])
        self.assertEqual(self.error_code(purchase_service.get_purchase_out, self.db, 999), 404)


class SupplierTests(PurchaseTestCase):
    def test_create_edit_and_deactivate(self):
        created = supplier_service.create_supplier(
            self.db, SupplierCreate(name="  Metro FMCG  ", phone=" 01611-666777 ", email=" INFO@Metro.com ", address="  "), MANAGER
        )
        self.db.commit()
        self.assertEqual((created.name, created.phone, created.email, created.address, created.status), ("Metro FMCG", "01611-666777", "info@metro.com", None, "active"))

        supplier_service.update_supplier(
            self.db, created.supplier_id, SupplierUpdate(name="Metro FMCG", phone="01611-666777", email="info@metro.com", status="inactive"), MANAGER
        )
        self.db.commit()
        log = self.db.scalars(select(ActivityLog).where(ActivityLog.action == "UPDATE")).one()
        self.assertEqual((log.entity, log.reference, log.details), ("Supplier", "Metro FMCG", "Deactivated"))
        self.assertEqual(self.db.get(Supplier, created.supplier_id).status, "inactive")

    def test_names_must_be_unique_ignoring_case(self):
        self.assertEqual(self.error_code(supplier_service.create_supplier, self.db, SupplierCreate(name="abc traders", phone="1"), MANAGER), 409)
        clash = SupplierUpdate(name="RUPCHANDA", phone="1", status="active")
        self.assertEqual(self.error_code(supplier_service.update_supplier, self.db, self.abc.supplier_id, clash, MANAGER), 409)
        same_name = SupplierUpdate(name="ABC Traders", phone="01700-000000", status="active")  # editing keeps its own name
        supplier_service.update_supplier(self.db, self.abc.supplier_id, same_name, MANAGER)
        self.assertEqual(self.error_code(supplier_service.update_supplier, self.db, 999, same_name, MANAGER), 404)

    def test_list_search_and_status_filter(self):
        self.assertEqual([s.name for s in supplier_service.list_suppliers(self.db)], ["ABC Traders", "Closed Co", "Rupchanda"])
        self.assertEqual([s.name for s in supplier_service.list_suppliers(self.db, status_filter="inactive")], ["Closed Co"])
        self.assertEqual([s.name for s in supplier_service.list_suppliers(self.db, search="0181")], ["Rupchanda"])

    def test_the_schema_checks_phone_and_email(self):
        for bad in (dict(name="X", phone="abc"), dict(name="X", phone="1", email="not-an-email"), dict(name=" ", phone="1")):
            with self.assertRaises(ValueError):
                SupplierCreate(**bad)


if __name__ == "__main__":
    unittest.main()