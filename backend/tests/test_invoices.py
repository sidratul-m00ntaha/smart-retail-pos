"""Invoices and the sales list: the invoice document (PRD 5.17) and the filtered list behind the Sales and Invoices pages.

They use a throwaway in-memory database, never your Docker one.
Run from the backend folder:  python -m unittest tests.test_invoices -v
"""
import unittest
from datetime import datetime, timedelta, timezone
from decimal import Decimal as D

from fastapi import HTTPException
from sqlalchemy import select

from app.models import Product, StoreSetting, User
from app.models.customer import Customer
from app.models.sale import Sale
from app.models.stock import ProductStock
from app.schemas.sale import SaleCreate
from app.services import invoice_service
from app.services.sale_service import complete_sale
from tests.test_complete_sale import cash, line, make_session


def at(day: int, hour: int = 10) -> datetime:
    return datetime(2026, 9, day, hour, 0, 0)  # the database stores UTC without a time zone


class InvoiceTests(unittest.TestCase):
    def setUp(self):
        self.db = make_session()
        self.db.add_all([ProductStock(product_id=1, current_stock=100), ProductStock(product_id=2, current_stock=100)])
        self.db.add(User(full_name="Rina Cashier", username="rina", email="rina@example.com", password_hash="x", role_id=1))
        self.bob = Customer(name="Bob Khan", phone="01722222222", credit_limit=D("1000"), outstanding_due=D("0"), loyalty_points=0)
        self.anna = Customer(name="Anna Roy", phone="01711111111", credit_limit=D("1000"), outstanding_due=D("0"), loyalty_points=0)
        self.db.add_all([self.bob, self.anna])
        self.db.commit()

    def tearDown(self):
        engine = self.db.get_bind()
        self.db.close()
        engine.dispose()

    def sell(self, product: int = 1, quantity: str = "1", paid: str | None = None, customer: Customer | None = None):
        unit_price = {1: D("94.50"), 2: D("450.00")}[product]  # milk and rice, VAT included
        amount = D(quantity) * unit_price if paid is None else D(paid)
        payments = [cash(str(amount))] if amount > 0 else []
        request = SaleCreate(customer_id=customer.customer_id if customer else None, items=[line(product, quantity)], payments=payments)
        return complete_sale(self.db, request, cashier_id=1).sale

    def stamp(self, sale_id: int, when: datetime) -> None:
        self.db.get(Sale, sale_id).created_at = when
        self.db.commit()

    # ---- the invoice document ----

    def test_the_invoice_has_the_store_cashier_and_customer_details(self):
        sale = self.sell(customer=self.bob)
        self.assertEqual((sale.store_name, sale.store_address, sale.store_phone), ("Smart Retail Store", "12 Market Road, Dhaka", "01700000000"))
        self.assertEqual((sale.cashier_name, sale.customer_name, sale.customer_phone), ("Rina Cashier", "Bob Khan", "01722222222"))

    def test_a_guest_sale_has_no_customer_and_a_missing_cashier_is_none(self):
        self.db.execute(User.__table__.delete())
        self.db.commit()
        sale = self.sell()
        self.assertEqual((sale.customer_name, sale.customer_phone, sale.cashier_name), (None, None, None))

    def test_the_invoice_number_uses_the_stores_prefix(self):
        self.db.get(StoreSetting, 1).invoice_prefix = "POS"
        self.db.commit()
        sale = self.sell()
        self.assertEqual(sale.invoice_number, f"POS-{datetime.now(timezone.utc).year}-{sale.sale_id:05d}")

    def test_an_invoice_can_be_fetched_by_number_or_by_sale_id_and_matches_what_was_returned(self):
        sale = self.sell(product=2, quantity="2", customer=self.anna)
        by_number = invoice_service.get_invoice(self.db, sale.invoice_number)
        by_id = invoice_service.get_sale(self.db, sale.sale_id)
        self.assertEqual(by_number.model_dump(mode="json"), by_id.model_dump(mode="json"))
        self.assertEqual(by_number.model_dump(mode="json"), sale.model_dump(mode="json"))  # what the POS showed == what is stored
        self.assertEqual(([i.product_name for i in by_number.items], [p.method for p in by_number.payments]), (["Rice 5kg"], ["cash"]))

    def test_an_unknown_invoice_or_sale_is_a_404(self):
        for lookup, value in ((invoice_service.get_invoice, "INV-1999-00001"), (invoice_service.get_sale, 999)):
            with self.assertRaises(HTTPException) as caught:
                lookup(self.db, value)
            self.assertEqual(caught.exception.status_code, 404)

    # ---- the list ----

    def test_the_list_is_newest_first_with_totals_over_every_match(self):
        first, second, third = self.sell(), self.sell(product=2), self.sell()
        for sale, when in ((first, at(1)), (second, at(2)), (third, at(3))):
            self.stamp(sale.sale_id, when)
        page = invoice_service.list_sales(self.db, page_size=2)
        self.assertEqual([r.invoice_number for r in page.items], [third.invoice_number, second.invoice_number])
        self.assertEqual((page.total, page.page, page.page_size, len(page.items)), (3, 1, 2, 2))
        self.assertEqual((page.totals.transactions, page.totals.total_amount, page.totals.paid_amount, page.totals.due_amount), (3, D("639.00"), D("639.00"), D("0.00")))  # sums of ALL 3, not the 2 shown
        rest = invoice_service.list_sales(self.db, page=2, page_size=2)
        self.assertEqual([r.invoice_number for r in rest.items], [first.invoice_number])

    def test_a_row_carries_what_the_list_shows(self):
        self.sell(quantity="3", customer=self.bob)
        (row,) = invoice_service.list_sales(self.db).items
        self.assertEqual((row.customer_name, row.customer_phone, row.cashier_name, row.item_count), ("Bob Khan", "01722222222", "Rina Cashier", D("3")))
        self.assertEqual((row.total_amount, row.payment_status, row.status), (D("283.50"), "PAID", "completed"))

    def test_filter_by_payment_status(self):
        self.sell()
        self.sell(paid="50", customer=self.bob)   # partly paid: 44.50 due
        self.sell(paid="0", customer=self.anna)   # everything on due
        self.assertEqual({r.payment_status for r in invoice_service.list_sales(self.db, payment_status="PAID").items}, {"PAID"})
        due = invoice_service.list_sales(self.db, payment_status="DUE")
        self.assertEqual((due.total, due.totals.due_amount), (1, D("94.50")))
        self.assertEqual(invoice_service.list_sales(self.db, payment_status="PARTIALLY_PAID").totals.due_amount, D("44.50"))

    def test_filter_by_date_range_start_included_end_not(self):
        sales = [self.sell() for _ in range(3)]
        for sale, when in zip(sales, (at(1, 23), at(2, 0), at(2, 23))):
            self.stamp(sale.sale_id, when)
        page = invoice_service.list_sales(self.db, created_from=at(2, 0), created_before=at(3, 0))
        self.assertEqual({r.sale_id for r in page.items}, {sales[1].sale_id, sales[2].sale_id})
        self.assertEqual(page.total, 2)
        self.assertEqual(invoice_service.list_sales(self.db, created_from=at(3, 0)).total, 0)

    def test_a_time_zone_on_the_dates_is_converted_to_utc(self):
        sale = self.sell()
        self.stamp(sale.sale_id, at(2, 20))  # 20:00 UTC = 02:00 on the 3rd in Dhaka (UTC+6)
        dhaka = timezone(timedelta(hours=6))
        self.assertEqual(invoice_service.list_sales(self.db, created_from=datetime(2026, 9, 3, tzinfo=dhaka), created_before=datetime(2026, 9, 4, tzinfo=dhaka)).total, 1)
        self.assertEqual(invoice_service.list_sales(self.db, created_from=datetime(2026, 9, 2, tzinfo=dhaka), created_before=datetime(2026, 9, 3, tzinfo=dhaka)).total, 0)

    def test_a_backwards_date_range_is_rejected(self):
        with self.assertRaises(HTTPException) as caught:
            invoice_service.list_sales(self.db, created_from=at(5), created_before=at(4))
        self.assertEqual((caught.exception.status_code, caught.exception.detail), (400, "The start date must be before the end date."))

    def test_search_by_invoice_number_or_customer_name_or_phone(self):
        a, b = self.sell(customer=self.bob), self.sell(customer=self.anna)
        self.sell()  # guest
        numbers = lambda **f: {r.invoice_number for r in invoice_service.list_sales(self.db, **f).items}
        self.assertEqual(numbers(search=a.invoice_number), {a.invoice_number})
        self.assertEqual(numbers(search="bob"), {a.invoice_number})
        self.assertEqual(numbers(search="0171111"), {b.invoice_number})
        self.assertEqual(numbers(search="  "), {r.invoice_number for r in invoice_service.list_sales(self.db).items})  # blank search = no filter
        self.assertEqual(numbers(search="%"), set())  # a typed % is searched for, not treated as "match everything"

    def test_filter_by_customer(self):
        self.sell(customer=self.bob)
        self.sell(customer=self.anna)
        page = invoice_service.list_sales(self.db, customer_id=self.anna.customer_id)
        self.assertEqual([r.customer_name for r in page.items], ["Anna Roy"])

    def test_an_empty_list_has_zero_totals(self):
        page = invoice_service.list_sales(self.db)
        self.assertEqual((page.items, page.total, page.totals.transactions, page.totals.total_amount), ([], 0, 0, D("0")))

    def test_selling_still_works_with_the_product_quantity_route(self):
        # invoices are built for products that only have a quantity too (Module 4 starts their stock from it)
        self.db.execute(ProductStock.__table__.delete())
        self.db.get(Product, 1).current_quantity = 5
        self.db.commit()
        self.assertEqual(self.sell(quantity="2").payment_status, "PAID")


if __name__ == "__main__":
    unittest.main()
