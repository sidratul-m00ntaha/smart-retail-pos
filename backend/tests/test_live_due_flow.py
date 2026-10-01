"""The Sales list shows each invoice's CURRENT due: buy on due, pay twice, return an item.
Uses a throwaway in-memory database, never your Docker one.

Run from the backend folder:  python -m unittest tests.test_live_due_flow -v
"""
import unittest
from decimal import Decimal as D

from app.models import User
from app.models.customer import Customer, CustomerPayment
from app.models.sale import Sale
from app.models.stock import ProductStock
from app.schemas.sale import SaleCreate
from app.schemas.sale_return import ReturnLineIn, SaleReturnCreate
from app.services.invoice_service import list_sales, live_dues
from app.services.sale_return_service import create_return
from app.services.sale_service import complete_sale
from tests.test_complete_sale import cash, line, make_session


class LiveDueFlowTests(unittest.TestCase):
    def setUp(self):
        self.db = make_session()
        # Sample products: 1 = Milk 90.00 + 5% VAT (94.50 each), 2 = Rice 450.00 + 0% VAT
        self.db.add_all([ProductStock(product_id=1, current_stock=10), ProductStock(product_id=2, current_stock=10)])
        self.db.add(User(full_name="Rina Cashier", username="rina", email="r@example.com", password_hash="x", role_id=1))
        self.db.commit()

    def tearDown(self):
        engine = self.db.get_bind()
        self.db.close()
        engine.dispose()

    def add_customer(self) -> Customer:
        customer = Customer(name="Bob Khan", phone="01722222222", credit_limit=D("5000"), outstanding_due=D("0"), loyalty_points=0)
        self.db.add(customer)
        self.db.commit()
        return customer

    def receive_due_payment(self, customer: Customer, amount: str) -> None:
        """What POST /api/customers/payments does: a CustomerPayments row, and the customer's due goes down."""
        self.db.refresh(customer)
        self.db.add(CustomerPayment(customer_id=customer.customer_id, amount=D(amount), method="cash"))
        customer.outstanding_due = customer.outstanding_due - D(amount)
        self.db.commit()

    def rows(self) -> dict:
        """The Sales list rows by sale id."""
        return {row.sale_id: row for row in list_sales(self.db).items}

    def test_buy_on_due_pay_twice_then_return_an_item(self):
        bob = self.add_customer()
        # Sale A: 4 milk = 378.00, everything on due. Sale B: 1 rice = 450.00, 100.00 paid, 350.00 on due.
        a = complete_sale(self.db, SaleCreate(customer_id=bob.customer_id, items=[line(1, "4")]), cashier_id=1).sale
        b = complete_sale(self.db, SaleCreate(customer_id=bob.customer_id, items=[line(2, "1")], payments=[cash("100.00")]), cashier_id=1).sale
        self.assertEqual(live_dues(self.db), {a.sale_id: D("378.00"), b.sale_id: D("350.00")})

        # First due payment of 300: it goes to the oldest sale (A).
        self.receive_due_payment(bob, "300.00")
        rows = self.rows()
        self.assertEqual((rows[a.sale_id].paid_amount, rows[a.sale_id].due_amount, rows[a.sale_id].payment_status), (D("300.00"), D("78.00"), "PARTIALLY_PAID"))
        self.assertEqual((rows[b.sale_id].paid_amount, rows[b.sale_id].due_amount, rows[b.sale_id].payment_status), (D("100.00"), D("350.00"), "PARTIALLY_PAID"))

        # Second due payment of 100: A is cleared (78.00), the other 22.00 goes to B.
        self.receive_due_payment(bob, "100.00")
        rows = self.rows()
        self.assertEqual((rows[a.sale_id].due_amount, rows[a.sale_id].payment_status), (D("0.00"), "PAID"))
        self.assertEqual((rows[b.sale_id].paid_amount, rows[b.sale_id].due_amount), (D("122.00"), D("328.00")))

        # Return 1 milk from A (94.50). The customer has a due, so the refund reduces the due: no refund method needed.
        create_return(
            self.db,
            a.sale_id,
            SaleReturnCreate(reason="Changed their mind", items=[ReturnLineIn(sale_item_id=a.items[0].sale_item_id, quantity=D("1"))]),
            user_id=1,
        )
        rows = self.rows()
        self.assertEqual(rows[a.sale_id].due_amount, D("0.00"))
        self.assertEqual((rows[b.sale_id].paid_amount, rows[b.sale_id].due_amount, rows[b.sale_id].payment_status), (D("216.50"), D("233.50"), "PARTIALLY_PAID"))

        # The live dues on the Sales page add up to what the Customers page shows.
        self.db.refresh(bob)
        self.assertEqual(bob.outstanding_due, D("233.50"))
        page = list_sales(self.db)
        self.assertEqual(page.totals.due_amount, bob.outstanding_due)

        # The Payment filter and the paging use the current status.
        self.assertEqual([row.sale_id for row in list_sales(self.db, payment_status="PAID").items], [a.sale_id])
        self.assertEqual([row.sale_id for row in list_sales(self.db, payment_status="PARTIALLY_PAID").items], [b.sale_id])
        self.assertEqual(list_sales(self.db, payment_status="DUE").total, 0)

        # The saved sale rows (the invoices) were never edited.
        self.db.expire_all()
        saved_a, saved_b = self.db.get(Sale, a.sale_id), self.db.get(Sale, b.sale_id)
        self.assertEqual((saved_a.paid_amount, saved_a.due_amount, saved_a.payment_status), (D("0.00"), D("378.00"), "DUE"))
        self.assertEqual((saved_b.paid_amount, saved_b.due_amount, saved_b.payment_status), (D("100.00"), D("350.00"), "PARTIALLY_PAID"))

    def test_guest_and_fully_paid_sales_are_not_changed(self):
        guest = complete_sale(self.db, SaleCreate(items=[line(1, "1")], payments=[cash("94.50")]), cashier_id=1).sale
        bob = self.add_customer()
        paid = complete_sale(self.db, SaleCreate(customer_id=bob.customer_id, items=[line(1, "1")], payments=[cash("94.50")]), cashier_id=1).sale
        self.assertEqual(live_dues(self.db), {})
        self.receive_due_payment(bob, "0.01")  # a payment with no credit sale to apply to changes nothing
        rows = self.rows()
        for sale in (guest, paid):
            self.assertEqual((rows[sale.sale_id].paid_amount, rows[sale.sale_id].due_amount, rows[sale.sale_id].payment_status), (D("94.50"), D("0.00"), "PAID"))


if __name__ == "__main__":
    unittest.main()
