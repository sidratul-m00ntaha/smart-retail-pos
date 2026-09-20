"""Tests for pausing and resuming a bill. They use a throwaway in-memory database, never your Docker one.

Run from the backend folder:  python -m unittest tests.test_held_carts -v
"""
import unittest
from decimal import Decimal as D

from fastapi import HTTPException
from sqlalchemy import func, select

from app.models.customer import Customer
from app.models.sale import HeldCart, HeldCartItem, Sale
from app.models.stock import ProductStock
from app.schemas.held_cart import HeldCartSave
from app.schemas.sale import SaleCreate
from app.services import held_cart_service as held
from app.services.sale_service import complete_sale
from tests.test_complete_sale import cash, line, make_session


def save(*lines, customer_id=None, note=None) -> HeldCartSave:
    return HeldCartSave(customer_id=customer_id, note=note, items=list(lines))


class HeldCartTests(unittest.TestCase):
    def setUp(self):
        self.db = make_session()
        # sample products: 1 = Milk (2 in stock), 2 = Rice (10 in stock), 3 = Soap (no stock row at all)
        self.db.add_all([ProductStock(product_id=1, current_stock=2), ProductStock(product_id=2, current_stock=10)])
        self.db.commit()

    def tearDown(self):
        engine = self.db.get_bind()
        self.db.close()
        engine.dispose()

    def count(self, model) -> int:
        return self.db.scalar(select(func.count()).select_from(model))

    def error_code(self, function, *args) -> int:
        with self.assertRaises(HTTPException) as caught:
            function(*args)
        return caught.exception.status_code

    def test_hold_saves_only_product_and_quantity_and_merges_duplicates(self):
        cart = held.hold_cart(self.db, save(line(1, "1"), line(2, "3"), line(1, "1"), note="  red jacket, lane 2  "), cashier_id=1)
        self.assertEqual((cart.status, cart.note, cart.item_count), ("held", "red jacket, lane 2", 2))
        self.assertEqual([(i.product_id, i.quantity) for i in cart.items], [(1, D("2")), (2, D("3"))])
        self.assertEqual(self.count(Sale), 0)  # a held bill is not a sale
        self.assertEqual(self.db.scalar(select(ProductStock.current_stock).where(ProductStock.product_id == 1)), 2)  # stock untouched

    def test_hold_rejects_bad_carts_and_saves_nothing(self):
        customer = Customer(name="Off", phone="0180000000", status="inactive")
        self.db.add(customer)
        self.db.commit()
        self.assertEqual(self.error_code(held.hold_cart, self.db, save(line(99, "1")), 1), 404)  # unknown product
        self.assertEqual(self.error_code(held.hold_cart, self.db, save(line(1, "1.5")), 1), 400)  # not a whole number
        self.assertEqual(self.error_code(held.hold_cart, self.db, save(line(1, "1"), customer_id=999), 1), 400)  # unknown customer
        self.assertEqual(self.error_code(held.hold_cart, self.db, save(line(1, "1"), customer_id=customer.customer_id), 1), 400)  # inactive
        self.assertEqual((self.count(HeldCart), self.count(HeldCartItem)), (0, 0))

    def test_list_shows_only_bills_on_hold_newest_first(self):
        first = held.hold_cart(self.db, save(line(1, "1"), note="first"), cashier_id=1)
        second = held.hold_cart(self.db, save(line(2, "1"), note="second"), cashier_id=2)
        gone = held.hold_cart(self.db, save(line(2, "2"), note="gone"), cashier_id=1)
        held.discard_held_cart(self.db, gone.held_cart_id)
        listed = held.list_held_carts(self.db)
        self.assertEqual([c.note for c in listed], ["second", "first"])
        self.assertEqual((listed[0].cashier_id, listed[1].cashier_id), (2, 1))  # any cashier sees every held bill
        self.assertEqual({c.held_cart_id for c in listed}, {first.held_cart_id, second.held_cart_id})

    def test_resume_rechecks_price_and_stock(self):
        cart = held.hold_cart(self.db, save(line(1, "5"), line(2, "3"), line(3, "1")), cashier_id=1)
        resumed = held.resume_held_cart(self.db, cart.held_cart_id)
        milk, rice, soap = resumed.items
        self.assertEqual((milk.product_name, milk.unit_price, milk.vat_percent), ("Milk 1L", D("90.00"), D("5.00")))
        self.assertEqual((milk.available_quantity, milk.problem), (2, "Only 2 in stock."))
        self.assertIsNone(rice.problem)
        self.assertEqual((soap.available_quantity, soap.problem), (0, "Out of stock."))
        self.assertTrue(resumed.has_problems)

    def test_resume_shows_a_missing_product_instead_of_failing(self):
        cart = held.hold_cart(self.db, save(line(2, "1")), cashier_id=1)
        self.db.add(HeldCartItem(held_cart_id=cart.held_cart_id, product_id=99, quantity=D("1")))  # the product vanished later
        self.db.commit()
        resumed = held.resume_held_cart(self.db, cart.held_cart_id)
        self.assertEqual((resumed.items[1].product_name, resumed.items[1].problem), (None, "Product 99 was not found."))
        self.assertTrue(resumed.has_problems)

    def test_resuming_does_not_take_the_bill_off_hold(self):
        cart = held.hold_cart(self.db, save(line(2, "1")), cashier_id=1)
        held.resume_held_cart(self.db, cart.held_cart_id)
        self.assertEqual(len(held.list_held_carts(self.db)), 1)
        self.assertFalse(held.resume_held_cart(self.db, cart.held_cart_id).has_problems)

    def test_update_replaces_the_items_instead_of_creating_a_duplicate(self):
        cart = held.hold_cart(self.db, save(line(1, "1"), note="old"), cashier_id=1)
        updated = held.update_held_cart(self.db, cart.held_cart_id, save(line(2, "4"), line(1, "2"), note="new"))
        self.assertEqual((updated.held_cart_id, updated.note, updated.item_count), (cart.held_cart_id, "new", 2))
        self.assertEqual(sorted((i.product_id, i.quantity) for i in updated.items), [(1, D("2")), (2, D("4"))])
        self.assertEqual((self.count(HeldCart), self.count(HeldCartItem)), (1, 2))

    def test_update_that_fails_leaves_the_held_bill_as_it_was(self):
        cart = held.hold_cart(self.db, save(line(1, "1"), note="keep me"), cashier_id=1)
        self.assertEqual(self.error_code(held.update_held_cart, self.db, cart.held_cart_id, save(line(99, "1"), note="bad")), 404)
        after = held.resume_held_cart(self.db, cart.held_cart_id)
        self.assertEqual((after.note, [i.product_id for i in after.items]), ("keep me", [1]))

    def test_discarded_and_missing_bills_cannot_be_used(self):
        cart = held.hold_cart(self.db, save(line(1, "1")), cashier_id=1)
        held.discard_held_cart(self.db, cart.held_cart_id)
        self.db.expire_all()
        self.assertEqual(self.db.get(HeldCart, cart.held_cart_id).status, "discarded")  # kept, not deleted
        for function, args in ((held.resume_held_cart, ()), (held.discard_held_cart, ()), (held.update_held_cart, (save(line(1, "1")),))):
            self.assertEqual(self.error_code(function, self.db, cart.held_cart_id, *args), 409)
        self.assertEqual(self.error_code(held.resume_held_cart, self.db, 12345), 404)

    def test_completing_the_sale_takes_the_bill_off_hold(self):
        cart = held.hold_cart(self.db, save(line(1, "2")), cashier_id=1)
        complete_sale(
            self.db,
            SaleCreate(items=[line(1, "2")], payments=[cash("189.00")], held_cart_id=cart.held_cart_id),
            cashier_id=1,
        )
        self.assertEqual(held.list_held_carts(self.db), [])
        self.assertEqual(self.error_code(held.resume_held_cart, self.db, cart.held_cart_id), 409)


if __name__ == "__main__":
    unittest.main()
