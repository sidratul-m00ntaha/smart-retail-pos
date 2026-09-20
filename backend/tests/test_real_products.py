"""Module 5 sells Module 2's real products and follows Module 4's stock rules.

They use a throwaway in-memory database, never your Docker one.
Run from the backend folder:  python -m unittest tests.test_real_products -v
"""
import unittest
from decimal import Decimal as D

from fastapi import HTTPException
from sqlalchemy import func, select

from app.models import Product, TaxRate
from app.models.sale import Sale
from app.models.stock import ProductStock
from app.schemas.held_cart import HeldCartSave
from app.schemas.sale import SaleCreate
from app.services import held_cart_service as held
from app.services.sale_dependencies import get_available_quantity, get_sellable_product
from app.services.sale_service import complete_sale
from tests.test_complete_sale import cash, line, make_session


class RealProductTests(unittest.TestCase):
    def setUp(self):
        self.db = make_session()

    def tearDown(self):
        engine = self.db.get_bind()
        self.db.close()
        engine.dispose()

    def sale_of_milk(self, quantity: str, amount: str):
        return complete_sale(self.db, SaleCreate(items=[line(1, quantity)], payments=[cash(amount)]), cashier_id=1)

    def test_a_seeded_product_with_only_a_quantity_can_be_sold_and_its_quantity_follows(self):
        # what seed_products.py creates: a quantity on the product, no ProductStock row
        self.db.get(Product, 1).current_quantity = 10
        self.db.commit()
        self.assertEqual(self.sale_of_milk("2", "189.00").sale.payment_status, "PAID")
        self.assertEqual(self.db.scalar(select(ProductStock.current_stock).where(ProductStock.product_id == 1)), 8)
        self.db.expire_all()
        self.assertEqual(self.db.get(Product, 1).current_quantity, 8)  # Module 4 keeps the product page number in step

    def test_not_enough_stock_is_judged_from_the_products_quantity(self):
        self.db.get(Product, 1).current_quantity = 1
        self.db.commit()
        with self.assertRaises(HTTPException) as caught:
            self.sale_of_milk("2", "189.00")
        self.assertEqual((caught.exception.status_code, caught.exception.detail), (409, "Not enough stock for 'Milk 1L'."))
        self.assertEqual(self.db.scalar(select(func.count()).select_from(Sale)), 0)

    def test_vat_follows_the_tax_rate_when_it_changes(self):
        self.db.add(ProductStock(product_id=1, current_stock=5))
        self.db.scalar(select(TaxRate).where(TaxRate.name == "VAT 5%")).rate_percent = D("15.00")
        self.db.commit()
        self.assertEqual(self.sale_of_milk("1", "103.50").sale.total_amount, D("103.50"))  # 90.00 + 15%, although tax_percent still says 5.00

    def test_a_product_without_a_tax_rate_uses_its_own_tax_percent(self):
        product = self.db.get(Product, 1)
        product.tax_rate_id, product.tax_percent = None, D("7.50")
        self.db.add(ProductStock(product_id=1, current_stock=5))
        self.db.commit()
        self.assertEqual(get_sellable_product(self.db, 1).vat_percent, D("7.50"))
        self.assertEqual(self.sale_of_milk("1", "96.75").sale.total_amount, D("96.75"))

    def test_an_inactive_product_cannot_be_sold(self):
        self.db.get(Product, 1).status = "inactive"
        self.db.add(ProductStock(product_id=1, current_stock=5))
        self.db.commit()
        with self.assertRaises(HTTPException) as caught:
            self.sale_of_milk("1", "94.50")
        self.assertEqual((caught.exception.status_code, caught.exception.detail), (400, "'Milk 1L' is inactive and cannot be sold."))
        self.assertEqual(self.db.scalar(select(func.count()).select_from(Sale)), 0)

    def test_an_unknown_product_says_which_id(self):
        with self.assertRaises(HTTPException) as caught:
            get_sellable_product(self.db, 99)
        self.assertEqual((caught.exception.status_code, caught.exception.detail), (404, "Product 99 was not found."))

    def test_available_quantity_is_the_stock_row_or_else_the_products_quantity(self):
        self.db.get(Product, 2).current_quantity = 10
        self.db.commit()
        self.assertEqual(get_available_quantity(self.db, 2), 10)  # no stock row yet
        self.db.add(ProductStock(product_id=2, current_stock=7))
        self.db.commit()
        self.assertEqual(get_available_quantity(self.db, 2), 7)  # the stock row wins
        self.assertEqual(get_available_quantity(self.db, 3), 0)  # quantity 0, no row
        self.assertEqual(get_available_quantity(self.db, 99), 0)  # unknown product

    def test_hold_and_resume_use_the_real_product_and_its_stock(self):
        self.db.get(Product, 2).current_quantity = 10
        self.db.commit()
        cart = held.hold_cart(self.db, HeldCartSave(items=[line(2, "3")]), cashier_id=1)
        (item,) = held.resume_held_cart(self.db, cart.held_cart_id).items
        self.assertEqual((item.product_name, item.unit_price, item.vat_percent, item.available_quantity, item.problem), ("Rice 5kg", D("450.00"), D("0.00"), 10, None))


if __name__ == "__main__":
    unittest.main()
