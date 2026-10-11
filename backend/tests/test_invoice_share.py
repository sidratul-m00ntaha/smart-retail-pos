"""The QR code link on an invoice and the public invoice page. Throwaway in-memory database.

Run from the backend folder:  python -m unittest tests.test_invoice_share -v
"""
import unittest
from decimal import Decimal as D

from fastapi import HTTPException

from app.models.customer import Customer
from app.models.stock import ProductStock
from app.schemas.sale import PublicInvoiceOut, SaleCreate
from app.services import invoice_link
from app.services.invoice_service import get_public_invoice
from app.services.sale_service import complete_sale
from tests.test_complete_sale import cash, line, make_session


class InvoiceLinkCodeTests(unittest.TestCase):
    def test_a_code_gives_back_its_invoice_number(self):
        code = invoice_link.make_code("INV-2026-00125")
        self.assertTrue(code.startswith("INV-2026-00125."))
        self.assertEqual(invoice_link.read_code(code), "INV-2026-00125")

    def test_a_changed_code_is_refused(self):
        code = invoice_link.make_code("INV-2026-00125")
        number, _, signature = code.rpartition(".")
        self.assertIsNone(invoice_link.read_code("INV-2026-00126." + signature))  # another invoice, same signature
        self.assertIsNone(invoice_link.read_code(number + "." + signature[:-1] + ("0" if signature[-1] != "0" else "1")))
        self.assertIsNone(invoice_link.read_code(number))  # no signature at all

    def test_nonsense_is_refused(self):
        for bad in ("", ".", "abc", "INV-2026-00125.", ".abcdef", "INV.2026.1.xyz"):
            self.assertIsNone(invoice_link.read_code(bad), bad)


class PublicInvoiceTests(unittest.TestCase):
    def setUp(self):
        self.db = make_session()
        self.db.add_all([ProductStock(product_id=pid, current_stock=10) for pid in (1, 2, 3)])
        self.customer = Customer(name="Bob Khan", phone="01722222222", credit_limit=D("0"), outstanding_due=D("0"), loyalty_points=0)
        self.db.add(self.customer)
        self.db.commit()

    def tearDown(self):
        engine = self.db.get_bind()
        self.db.close()
        engine.dispose()

    def test_the_sale_carries_a_code_that_opens_the_public_invoice(self):
        sale = complete_sale(self.db, SaleCreate(customer_id=self.customer.customer_id, items=[line(1, "2")], payments=[cash("189.00")]), cashier_id=1).sale
        self.assertEqual(invoice_link.read_code(sale.share_code), sale.invoice_number)

        public = get_public_invoice(self.db, sale.share_code)
        self.assertEqual((public.invoice_number, public.total_amount, public.customer_name), (sale.invoice_number, D("189.00"), "Bob Khan"))
        self.assertEqual([item.product_name for item in public.items], ["Milk 1L"])
        self.assertEqual(public.store_name, "Smart Retail Store")

    def test_the_public_invoice_hides_private_details(self):
        hidden = {"customer_phone", "customer_id", "cashier_id", "cashier_name", "sale_id", "share_code"}
        self.assertFalse(hidden & set(PublicInvoiceOut.model_fields))

    def test_a_wrong_code_is_not_found(self):
        sale = complete_sale(self.db, SaleCreate(items=[line(1, "1")], payments=[cash("94.50")]), cashier_id=1).sale
        for bad in ("INV-2026-99999." + sale.share_code.rpartition(".")[2], "nonsense", sale.invoice_number):
            with self.assertRaises(HTTPException) as caught:
                get_public_invoice(self.db, bad)
            self.assertEqual(caught.exception.status_code, 404, bad)


if __name__ == "__main__":
    unittest.main()
