"""Cancelling an item after the invoice. Uses a throwaway in-memory database, never your Docker one.

Run from the backend folder:  python -m unittest tests.test_sale_returns -v
"""
import unittest
from decimal import Decimal as D

from fastapi import HTTPException
from sqlalchemy import func, select

from app.models import User
from app.models.customer import Customer, LoyaltyTier, LoyaltyTransaction
from app.models.sale import Sale
from app.models.sale_return import SaleReturn, SaleReturnItem
from app.models.stock import ProductStock
from app.schemas.sale import SaleCreate
from app.schemas.sale_return import ReturnLineIn, SaleReturnCreate
from app.services.sale_return_service import already_returned, create_return
from app.services.sale_service import complete_sale
from tests.test_complete_sale import cash, line, make_session


def request(*lines, reason="Customer changed their mind", method=None) -> SaleReturnCreate:
    return SaleReturnCreate(reason=reason, items=list(lines), refund_method=method)


class SaleReturnTests(unittest.TestCase):
    def setUp(self):
        self.db = make_session()
        self.db.add_all([ProductStock(product_id=1, current_stock=10), ProductStock(product_id=2, current_stock=10)])
        self.db.add(User(full_name="Rina Cashier", username="rina", email="r@example.com", password_hash="x", role_id=1))
        self.tier = LoyaltyTier(name="Gold", required_points=0, discount_percent=D("0.00"))
        self.db.add(self.tier)
        self.db.commit()

    def tearDown(self):
        engine = self.db.get_bind()
        self.db.close()
        engine.dispose()

    def customer(self, credit="1000", due="0", points=0) -> Customer:
        c = Customer(name="Bob Khan", phone="01722222222", credit_limit=D(credit), outstanding_due=D(due), loyalty_points=points, loyalty_tier_id=self.tier.loyalty_tier_id)
        self.db.add(c)
        self.db.commit()
        return c

    def sell(self, *lines, customer=None, paid=None):
        payments = [] if paid == "" else [cash(paid if paid is not None else "999999")]
        result = complete_sale(self.db, SaleCreate(customer_id=customer.customer_id if customer else None, items=list(lines), payments=payments), cashier_id=1)
        return result.sale

    def stock(self, product_id: int) -> int:
        self.db.expire_all()
        return self.db.scalar(select(ProductStock.current_stock).where(ProductStock.product_id == product_id))

    def test_returning_the_full_quantity_refunds_exactly_what_was_charged_and_restocks(self):
        sale = self.sell(line(1, "2"), paid="189.00")  # Milk 90.00 x2 + 5% VAT = 189.00
        item_id = sale.items[0].sale_item_id
        result = create_return(self.db, sale.sale_id, request(ReturnLineIn(sale_item_id=item_id, quantity=D("2")), method="cash"), user_id=1)
        self.assertEqual((result.refund_amount, result.due_reduced, result.refund_method), (D("189.00"), D("0.00"), "cash"))
        self.assertEqual(result.return_number, f"RET-{result.created_at.year}-{result.sale_return_id:05d}")
        self.assertEqual(result.invoice_number, sale.invoice_number)
        self.assertEqual(self.stock(1), 10)  # 10 - 2 sold + 2 returned
        self.db.refresh(self.db.get(Sale, sale.sale_id))
        self.assertEqual(self.db.get(Sale, sale.sale_id).status, "returned")
        self.assertEqual(already_returned(self.db, item_id), D("2"))

    def test_a_partial_return_is_prorated_and_leaves_the_sale_partly_returned(self):
        sale = self.sell(line(1, "4"), paid="378.00")  # 90.00 x4 + 5% VAT = 378.00
        item_id = sale.items[0].sale_item_id
        result = create_return(self.db, sale.sale_id, request(ReturnLineIn(sale_item_id=item_id, quantity=D("1")), method="cash"), user_id=1)
        self.assertEqual(result.refund_amount, D("94.50"))  # a quarter of 378.00
        self.assertEqual(self.db.get(Sale, sale.sale_id).status, "partially_returned")
        self.assertEqual(already_returned(self.db, item_id), D("1"))

    def test_cannot_return_more_than_was_bought_even_across_two_returns(self):
        sale = self.sell(line(1, "2"), paid="189.00")
        item_id = sale.items[0].sale_item_id
        create_return(self.db, sale.sale_id, request(ReturnLineIn(sale_item_id=item_id, quantity=D("1")), method="cash"), user_id=1)
        with self.assertRaises(HTTPException) as caught:
            create_return(self.db, sale.sale_id, request(ReturnLineIn(sale_item_id=item_id, quantity=D("2")), method="cash"), user_id=1)
        self.assertEqual((caught.exception.status_code, caught.exception.detail), (400, "Only 1.000 of 'Milk 1L' can still be returned."))
        self.assertEqual(already_returned(self.db, item_id), D("1"))  # the failed attempt saved nothing

    def test_returning_from_an_unknown_sale_item_or_an_already_fully_returned_sale_is_rejected(self):
        sale = self.sell(line(1, "1"), paid="94.50")
        item_id = sale.items[0].sale_item_id
        with self.assertRaises(HTTPException) as caught:
            create_return(self.db, sale.sale_id, request(ReturnLineIn(sale_item_id=99999, quantity=D("1"))), user_id=1)
        self.assertEqual(caught.exception.status_code, 400)
        create_return(self.db, sale.sale_id, request(ReturnLineIn(sale_item_id=item_id, quantity=D("1")), method="cash"), user_id=1)
        with self.assertRaises(HTTPException) as caught:
            create_return(self.db, sale.sale_id, request(ReturnLineIn(sale_item_id=item_id, quantity=D("1")), method="cash"), user_id=1)
        self.assertEqual(caught.exception.status_code, 409)

    def test_unknown_sale_is_404(self):
        with self.assertRaises(HTTPException) as caught:
            create_return(self.db, 99999, request(ReturnLineIn(sale_item_id=1, quantity=D("1"))), user_id=1)
        self.assertEqual(caught.exception.status_code, 404)

    def test_a_line_marked_not_restocked_does_not_go_back_into_stock(self):
        sale = self.sell(line(1, "1"), paid="94.50")
        item_id = sale.items[0].sale_item_id
        create_return(self.db, sale.sale_id, request(ReturnLineIn(sale_item_id=item_id, quantity=D("1"), restock=False), method="cash"), user_id=1)
        self.assertEqual(self.stock(1), 9)  # 10 - 1 sold, no +1 back

    def test_a_guest_refund_needs_a_method_since_there_is_no_due_to_offset_it(self):
        sale = self.sell(line(1, "1"), paid="94.50")
        item_id = sale.items[0].sale_item_id
        with self.assertRaises(HTTPException) as caught:
            create_return(self.db, sale.sale_id, request(ReturnLineIn(sale_item_id=item_id, quantity=D("1"))), user_id=1)
        self.assertEqual((caught.exception.status_code, caught.exception.detail), (400, "A refund method is required for the part not covered by the due."))
        result = create_return(self.db, sale.sale_id, request(ReturnLineIn(sale_item_id=item_id, quantity=D("1")), method="cash"), user_id=1)
        self.assertEqual((result.refund_amount, result.refund_method, result.due_reduced), (D("94.50"), "cash", D("0.00")))

    def test_the_refund_reduces_the_due_first_then_refunds_the_rest_by_the_chosen_method(self):
        bob = self.customer(due="50.00")
        sale = self.sell(line(1, "2"), customer=bob, paid="189.00")
        item_id = sale.items[0].sale_item_id
        result = create_return(self.db, sale.sale_id, request(ReturnLineIn(sale_item_id=item_id, quantity=D("2")), method="card"), user_id=1)
        self.assertEqual((result.due_reduced, result.refund_method, result.refund_amount), (D("50.00"), "card", D("189.00")))  # 189 due-offset 50 -> 139 by card
        self.db.refresh(bob)
        self.assertEqual(bob.outstanding_due, D("0.00"))

    def test_a_refund_fully_covered_by_the_due_needs_no_method(self):
        bob = self.customer(due="500.00")
        sale = self.sell(line(1, "1"), customer=bob, paid="94.50")
        item_id = sale.items[0].sale_item_id
        result = create_return(self.db, sale.sale_id, request(ReturnLineIn(sale_item_id=item_id, quantity=D("1"))), user_id=1)
        self.assertEqual((result.due_reduced, result.refund_method), (D("94.50"), None))
        self.db.refresh(bob)
        self.assertEqual(bob.outstanding_due, D("405.50"))

    def test_points_are_reversed_in_proportion_to_the_refund(self):
        bob = self.customer()
        sale = self.sell(line(1, "3"), customer=bob, paid="283.50")  # 3 x Milk, fully paid -> earns 2 points (1 per 100)
        self.db.refresh(bob)
        self.assertEqual(bob.loyalty_points, 2)
        item_id = sale.items[0].sale_item_id
        create_return(self.db, sale.sale_id, request(ReturnLineIn(sale_item_id=item_id, quantity=D("3")), method="cash"), user_id=1)  # return it all
        self.db.refresh(bob)
        self.assertEqual(bob.loyalty_points, 0)  # the 2 points this sale earned are reversed
        (entry,) = self.db.scalars(select(LoyaltyTransaction).where(LoyaltyTransaction.transaction_type == "reversal"))
        self.assertEqual((entry.customer_id, entry.sale_id, entry.points), (bob.customer_id, sale.sale_id, -2))

    def test_points_reversal_never_takes_the_balance_below_zero(self):
        bob = self.customer()
        sale = self.sell(line(1, "3"), customer=bob, paid="283.50")  # earns 2 points
        bob.loyalty_points = 1  # 1 was already spent elsewhere before the return
        self.db.commit()
        item_id = sale.items[0].sale_item_id
        create_return(self.db, sale.sale_id, request(ReturnLineIn(sale_item_id=item_id, quantity=D("3")), method="cash"), user_id=1)
        self.db.refresh(bob)
        self.assertEqual(bob.loyalty_points, 0)  # capped at 0, not -1
        (entry,) = self.db.scalars(select(LoyaltyTransaction).where(LoyaltyTransaction.transaction_type == "reversal"))
        self.assertEqual(entry.points, -1)

    def test_a_failed_return_saves_nothing_and_reverses_no_points_or_stock(self):
        bob = self.customer(points=5)
        sale = self.sell(line(1, "1"), customer=bob, paid="94.50")
        item_id = sale.items[0].sale_item_id
        with self.assertRaises(HTTPException):
            create_return(self.db, sale.sale_id, request(ReturnLineIn(sale_item_id=item_id, quantity=D("5"))), user_id=1)  # more than was bought
        self.assertEqual(self.db.scalar(select(func.count()).select_from(SaleReturn)), 0)
        self.assertEqual(self.db.scalar(select(func.count()).select_from(SaleReturnItem)), 0)
        self.assertEqual(self.stock(1), 9)
        self.db.refresh(bob)
        self.assertEqual(bob.loyalty_points, 5)

    def test_returning_two_different_lines_at_once(self):
        sale = self.sell(line(1, "2"), line(2, "1"), paid="639.00")  # 189.00 milk + 450.00 rice
        milk_id, rice_id = sale.items[0].sale_item_id, sale.items[1].sale_item_id
        result = create_return(self.db, sale.sale_id, request(ReturnLineIn(sale_item_id=milk_id, quantity=D("1")), ReturnLineIn(sale_item_id=rice_id, quantity=D("1")), method="cash"), user_id=1)
        self.assertEqual(result.refund_amount, D("94.50") + D("450.00"))
        self.assertEqual(len(result.items), 2)
        self.assertEqual(self.db.get(Sale, sale.sale_id).status, "partially_returned")  # 1 of 2 milk still not returned


if __name__ == "__main__":
    unittest.main()
