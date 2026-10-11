"""Mobile wallet payments (bKash, Nagad, Rocket) with a transaction ID. Throwaway in-memory database, never your Docker one.

Run from the backend folder:  python -m unittest tests.test_payment_methods -v
"""
import unittest
from decimal import Decimal as D

from fastapi import HTTPException
from pydantic import ValidationError
from sqlalchemy import create_engine, func, inspect, select, text

from app.models.sale import Payment, Sale
from app.models.stock import ProductStock
from app.schema_updates import add_missing_columns
from app.schemas.sale import PaymentIn, SaleCreate
from app.services.sale_service import complete_sale
from tests.test_complete_sale import cash, line, make_session


def wallet(method: str, amount: str, reference: str | None) -> PaymentIn:
    return PaymentIn(method=method, amount=D(amount), reference=reference)


class PaymentInRules(unittest.TestCase):
    def test_a_wallet_payment_needs_a_transaction_id(self):
        for method in ("bkash", "nagad", "rocket"):
            with self.assertRaises(ValidationError):
                wallet(method, "100.00", None)
            with self.assertRaises(ValidationError):
                wallet(method, "100.00", "   ")

    def test_the_transaction_id_is_tidied_up(self):
        self.assertEqual(wallet("bkash", "100.00", "  8n7a6d5ee7 ").reference, "8N7A6D5EE7")

    def test_a_bad_transaction_id_is_rejected(self):
        for bad in ("abc", "has space1", "semi;colon", "x" * 51):
            with self.assertRaises(ValidationError, msg=bad):
                wallet("nagad", "100.00", bad)

    def test_other_methods_never_keep_a_transaction_id(self):
        self.assertIsNone(wallet("cash", "100.00", "SHOULDNOTSTAY").reference)
        self.assertIsNone(wallet("card", "100.00", "SHOULDNOTSTAY").reference)

    def test_the_old_methods_still_work(self):
        for method in ("cash", "card", "digital"):
            self.assertEqual(PaymentIn(method=method, amount=D("5.00")).method, method)


class WalletSaleTests(unittest.TestCase):
    def setUp(self):
        self.db = make_session()
        self.db.add_all([ProductStock(product_id=pid, current_stock=10) for pid in (1, 2, 3)])
        self.db.commit()

    def tearDown(self):
        engine = self.db.get_bind()
        self.db.close()
        engine.dispose()

    def sell(self, *payments):
        return complete_sale(self.db, SaleCreate(items=[line(2, "1")], payments=list(payments)), cashier_id=1).sale  # Rice 450.00

    def test_a_split_cash_and_bkash_sale_keeps_the_transaction_id(self):
        sale = self.sell(cash("50.00"), wallet("bkash", "400.00", "ab12cd34"))
        self.assertEqual(sale.payment_status, "PAID")
        by_method = {p.method: p for p in sale.payments}
        self.assertEqual(by_method["bkash"].reference, "AB12CD34")
        self.assertIsNone(by_method["cash"].reference)
        saved = self.db.scalar(select(Payment).where(Payment.method == "bkash"))
        self.assertEqual((saved.amount, saved.reference), (D("400.00"), "AB12CD34"))

    def test_the_same_transaction_id_cannot_pay_two_sales(self):
        self.sell(wallet("nagad", "450.00", "TRX0001"))
        with self.assertRaises(HTTPException) as caught:
            self.sell(wallet("nagad", "450.00", "trx0001"))
        self.assertEqual(caught.exception.status_code, 409)
        self.assertEqual(self.db.scalar(select(func.count()).select_from(Sale)), 1)  # the second sale left nothing behind
        self.assertEqual(self.db.scalar(select(ProductStock.current_stock).where(ProductStock.product_id == 2)), 9)

    def test_two_wallets_may_have_the_same_looking_id(self):
        self.sell(wallet("nagad", "450.00", "SHARED01"))
        self.sell(wallet("rocket", "450.00", "SHARED01"))
        self.assertEqual(self.db.scalar(select(func.count()).select_from(Payment)), 2)


class AddMissingColumnsTests(unittest.TestCase):
    def test_adds_the_column_once_and_keeps_the_data(self):
        engine = create_engine("sqlite://")
        with engine.begin() as connection:  # a Payments table the way it was before the column existed
            connection.execute(text("CREATE TABLE Payments (payment_id INTEGER PRIMARY KEY, method NVARCHAR(20), amount NUMERIC)"))
            connection.execute(text("INSERT INTO Payments (method, amount) VALUES ('cash', 10)"))
        self.assertEqual(add_missing_columns(engine), ["Payments.reference"])
        self.assertIn("reference", [c["name"] for c in inspect(engine).get_columns("Payments")])
        with engine.connect() as connection:
            self.assertEqual(connection.execute(text("SELECT method, reference FROM Payments")).one(), ("cash", None))
        self.assertEqual(add_missing_columns(engine), [])  # running it again changes nothing
        engine.dispose()

    def test_skips_a_table_that_does_not_exist_yet(self):
        engine = create_engine("sqlite://")
        self.assertEqual(add_missing_columns(engine), [])
        engine.dispose()


if __name__ == "__main__":
    unittest.main()
