"""A sale's points must appear in the loyalty history (LoyaltyTransactions), linked to the sale.

Needs Module 6's add_points(..., sale_id=, description=) - branch feat/module-6-loyalty-logging.
Run from the backend folder:  python -m unittest tests.test_loyalty_history -v
"""
import unittest
from decimal import Decimal as D

from sqlalchemy import func, select

from app.models.customer import Customer, LoyaltyTransaction
from app.models.stock import ProductStock
from app.schemas.sale import SaleCreate
from app.services.sale_service import complete_sale
from tests.test_complete_sale import cash, line, make_session


class LoyaltyHistoryTests(unittest.TestCase):
    def setUp(self):
        self.db = make_session()
        self.db.add(ProductStock(product_id=1, current_stock=10))
        self.customer = Customer(name="Test Customer", phone="0170000000", credit_limit=D("1000"), outstanding_due=D("0"), loyalty_points=0)
        self.db.add(self.customer)
        self.db.commit()

    def tearDown(self):
        engine = self.db.get_bind()
        self.db.close()
        engine.dispose()

    def history(self) -> list[LoyaltyTransaction]:
        return list(self.db.scalars(select(LoyaltyTransaction).order_by(LoyaltyTransaction.loyalty_transaction_id)))

    def test_points_are_logged_with_the_sale(self):
        # 3 x Milk = 270.00 + 5% VAT = 283.50, paid in full -> 2 points (1 per 100 paid)
        result = complete_sale(
            self.db,
            SaleCreate(customer_id=self.customer.customer_id, items=[line(1, "3")], payments=[cash("283.50")]),
            cashier_id=1,
        )
        (entry,) = self.history()
        self.assertEqual((entry.customer_id, entry.sale_id, entry.transaction_type, entry.points), (self.customer.customer_id, result.sale.sale_id, "earn", 2))
        self.assertEqual(entry.description, f"Sale {result.sale.invoice_number}")
        self.db.refresh(self.customer)
        self.assertEqual(self.customer.loyalty_points, 2)

    def test_no_history_when_nothing_was_paid(self):
        complete_sale(self.db, SaleCreate(customer_id=self.customer.customer_id, items=[line(1, "3")]), cashier_id=1)  # all on due
        self.assertEqual(self.history(), [])

    def test_a_failed_sale_leaves_no_history(self):
        with self.assertRaises(Exception):
            complete_sale(
                self.db,
                SaleCreate(customer_id=self.customer.customer_id, items=[line(1, "11")], payments=[cash("1000.00")]),  # only 10 in stock
                cashier_id=1,
            )
        self.assertEqual(self.db.scalar(select(func.count()).select_from(LoyaltyTransaction)), 0)


if __name__ == "__main__":
    unittest.main()
