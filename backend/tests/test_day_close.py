"""The end-of-day closing report: what came in by each method, per-cashier totals and the cash the drawer should hold.
Throwaway in-memory database.

Run from the backend folder:  python -m unittest tests.test_day_close -v
"""
import unittest
from datetime import timedelta
from decimal import Decimal as D

from fastapi import HTTPException
from pydantic import ValidationError
from sqlalchemy import func, select

from app.models import ActivityLog, DayClosing, User
from app.models.customer import Customer, CustomerPayment
from app.models.sale import Sale
from app.models.stock import ProductStock
from app.schemas.day_close import DayCloseSave
from app.schemas.sale import PaymentIn, SaleCreate
from app.schemas.sale_return import ReturnLineIn, SaleReturnCreate
from app.services.day_close_service import get_day_close, save_day_close, store_today
from app.services.sale_return_service import create_return
from app.services.sale_service import complete_sale
from tests.test_complete_sale import cash, line, make_session


class DayCloseTests(unittest.TestCase):
    def setUp(self):
        self.db = make_session()
        self.db.add_all([ProductStock(product_id=pid, current_stock=20) for pid in (1, 2, 3)])
        self.db.add_all([
            User(full_name="Rina Cashier", username="rina", email="r@example.com", password_hash="x", role_id=1),
            User(full_name="Sam Cashier", username="sam", email="s@example.com", password_hash="x", role_id=1),
        ])
        self.customer = Customer(name="Bob Khan", phone="01722222222", credit_limit=D("1000"), outstanding_due=D("0"), loyalty_points=0)
        self.db.add(self.customer)
        self.db.commit()

    def tearDown(self):
        engine = self.db.get_bind()
        self.db.close()
        engine.dispose()

    def sell(self, cashier_id, items, payments, customer=None):
        data = SaleCreate(customer_id=customer.customer_id if customer else None, items=items, payments=payments)
        return complete_sale(self.db, data, cashier_id=cashier_id).sale

    def busy_day(self):
        """Rina: milk x2 for 189.00 cash, then rice 450.00 with 100.00 cash and 350.00 on Bob's due.
        Sam: rice 450.00 by bKash. Then Bob pays 50.00 cash and 20.00 by Nagad towards his due, and the milk sale is refunded in cash."""
        milk = self.sell(1, [line(1, "2")], [cash("189.00")])
        self.sell(1, [line(2, "1")], [cash("100.00")], customer=self.customer)
        self.sell(2, [line(2, "1")], [PaymentIn(method="bkash", amount=D("450.00"), reference="TRX12345")])
        self.db.add_all([
            CustomerPayment(customer_id=self.customer.customer_id, amount=D("50.00"), method="cash", recorded_by=1),
            CustomerPayment(customer_id=self.customer.customer_id, amount=D("20.00"), method="nagad", recorded_by=1),
        ])
        self.db.commit()
        create_return(self.db, milk.sale_id, SaleReturnCreate(reason="Wrong item", items=[ReturnLineIn(sale_item_id=milk.items[0].sale_item_id, quantity=D("2"))], refund_method="cash"), user_id=1)

    def test_an_empty_day_is_all_zeros_with_the_cash_row_present(self):
        report = get_day_close(self.db)
        self.assertEqual((report.totals.transactions, report.totals.gross_sales, report.cash_net), (0, D("0.00"), D("0.00")))
        self.assertEqual([m.method for m in report.methods], ["cash"])
        self.assertEqual(report.cashiers, [])
        self.assertIsNone(report.closing)

    def test_the_days_totals(self):
        self.busy_day()
        t = get_day_close(self.db).totals
        self.assertEqual(t.transactions, 3)
        self.assertEqual((t.gross_sales, t.returns_total, t.net_sales), (D("1089.00"), D("189.00"), D("900.00")))
        self.assertEqual((t.paid_amount, t.due_amount, t.dues_collected), (D("739.00"), D("350.00"), D("70.00")))

    def test_money_by_method(self):
        self.busy_day()
        report = get_day_close(self.db)
        rows = {m.method: m for m in report.methods}
        self.assertEqual(list(rows), ["cash", "bkash", "nagad"])
        self.assertEqual((rows["cash"].sales_received, rows["cash"].dues_received, rows["cash"].refunded, rows["cash"].net), (D("289.00"), D("50.00"), D("189.00"), D("150.00")))
        self.assertEqual(rows["bkash"].net, D("450.00"))
        self.assertEqual((rows["nagad"].sales_received, rows["nagad"].dues_received, rows["nagad"].net), (D("0.00"), D("20.00"), D("20.00")))
        self.assertEqual(report.cash_net, D("150.00"))

    def test_totals_per_cashier(self):
        self.busy_day()
        cashiers = {c.cashier_name: c for c in get_day_close(self.db).cashiers}
        rina, sam = cashiers["Rina Cashier"], cashiers["Sam Cashier"]
        self.assertEqual((rina.transactions, rina.total_amount, rina.cash_received, rina.other_received, rina.due_amount), (2, D("639.00"), D("289.00"), D("0.00"), D("350.00")))
        self.assertEqual((sam.transactions, sam.total_amount, sam.cash_received, sam.other_received, sam.due_amount), (1, D("450.00"), D("0.00"), D("450.00"), D("0.00")))

    def test_a_refund_taken_off_the_due_is_not_cash_out_of_the_drawer(self):
        sale = self.sell(1, [line(2, "1")], [cash("100.00")], customer=self.customer)  # 350.00 goes on Bob's due
        item = sale.items[0]
        create_return(self.db, sale.sale_id, SaleReturnCreate(reason="Changed mind", items=[ReturnLineIn(sale_item_id=item.sale_item_id, quantity=D("1"))], refund_method="cash"), user_id=1)
        # the 450.00 refund first clears the 350.00 due; only 100.00 is handed back in cash
        cash_row = next(m for m in get_day_close(self.db).methods if m.method == "cash")
        self.assertEqual((cash_row.sales_received, cash_row.refunded, cash_row.net), (D("100.00"), D("100.00"), D("0.00")))

    def test_saving_the_count_works_out_expected_cash_and_the_difference(self):
        self.busy_day()
        report = save_day_close(self.db, 1, DayCloseSave(opening_cash=D("100.00"), counted_cash=D("245.00"), note="  a 5 Tk note is missing "))
        closing = report.closing
        self.assertEqual((closing.opening_cash, closing.expected_cash, closing.counted_cash, closing.difference), (D("100.00"), D("250.00"), D("245.00"), D("-5.00")))
        self.assertEqual((closing.note, closing.closed_by_name), ("a 5 Tk note is missing", "Rina Cashier"))

    def test_closing_the_same_day_again_replaces_the_count(self):
        self.busy_day()
        save_day_close(self.db, 1, DayCloseSave(opening_cash=D("0"), counted_cash=D("100.00")))
        report = save_day_close(self.db, 2, DayCloseSave(opening_cash=D("0"), counted_cash=D("150.00")))
        self.assertEqual(self.db.scalar(select(func.count()).select_from(DayClosing)), 1)
        self.assertEqual((report.closing.counted_cash, report.closing.difference, report.closing.closed_by_name), (D("150.00"), D("0.00"), "Sam Cashier"))
        actions = list(self.db.scalars(select(ActivityLog.action).where(ActivityLog.entity == "DayClosing").order_by(ActivityLog.activity_log_id)))
        self.assertEqual(actions, ["CREATE", "UPDATE"])

    def test_the_last_count_is_suggested_as_the_next_opening_cash(self):
        yesterday = store_today() - timedelta(days=1)
        save_day_close(self.db, 1, DayCloseSave(business_date=yesterday, opening_cash=D("0"), counted_cash=D("300.00")))
        self.assertEqual(get_day_close(self.db).suggested_opening_cash, D("300.00"))
        self.assertEqual(get_day_close(self.db, yesterday).suggested_opening_cash, D("0.00"))

    def test_a_day_in_the_future_cannot_be_reported_or_closed(self):
        tomorrow = store_today() + timedelta(days=1)
        for action in (lambda: get_day_close(self.db, tomorrow), lambda: save_day_close(self.db, 1, DayCloseSave(business_date=tomorrow, opening_cash=D("0"), counted_cash=D("0")))):
            with self.assertRaises(HTTPException) as caught:
                action()
            self.assertEqual(caught.exception.status_code, 400)

    def test_yesterdays_report_does_not_include_todays_sales(self):
        self.busy_day()
        self.assertEqual(get_day_close(self.db, store_today() - timedelta(days=1)).totals.transactions, 0)

    def test_the_count_cannot_be_negative(self):
        with self.assertRaises(ValidationError):
            DayCloseSave(opening_cash=D("0"), counted_cash=D("-1"))


if __name__ == "__main__":
    unittest.main()
