"""Run from the backend folder:  python -m unittest tests.test_sale_calculator -v"""
import unittest
from decimal import Decimal as D

from app.services.sale_calculator import (
    DUE,
    PAID,
    PARTIALLY_PAID,
    LineInput,
    PaymentError,
    calculate_line,
    calculate_sale,
    money,
    settle_payment,
)


def line(price: str, qty: str = "1", tax: str = "0", product_id: int = 1) -> LineInput:
    return LineInput(product_id=product_id, quantity=D(qty), unit_price=D(price), tax_percent=D(tax))


class CalculateLineTests(unittest.TestCase):
    def test_vat_only(self):
        r = calculate_line(line("100.00", "2", "15"), D("0"))
        self.assertEqual((r.line_subtotal, r.discount_amount, r.tax_amount, r.line_total), (D("200.00"), D("0.00"), D("30.00"), D("230.00")))

    def test_discount_is_applied_before_vat(self):
        r = calculate_line(line("100.00", "2", "15"), D("5"))
        self.assertEqual(r.discount_amount, D("10.00"))
        self.assertEqual(r.tax_amount, D("28.50"))  # 15% of 190.00, not of 200.00
        self.assertEqual(r.line_total, D("218.50"))

    def test_rounds_half_up_not_bankers(self):
        self.assertEqual(money(D("0.005")), D("0.01"))
        self.assertEqual(calculate_line(line("0.10", "1", "5"), D("0")).tax_amount, D("0.01"))

    def test_fractional_quantity(self):
        self.assertEqual(calculate_line(line("20.00", "1.5"), D("0")).line_subtotal, D("30.00"))

    def test_float_is_rejected(self):
        with self.assertRaises(TypeError):
            calculate_line(LineInput(1, D("1"), 9.99, D("0")), D("0"))  # type: ignore[arg-type]

    def test_bad_values_are_rejected(self):
        with self.assertRaises(ValueError):
            calculate_line(line("10.00", "0"), D("0"))
        with self.assertRaises(ValueError):
            calculate_line(line("10.00", "1", "101"), D("0"))
        with self.assertRaises(ValueError):
            calculate_line(line("10.00"), D("-1"))


class CalculateSaleTests(unittest.TestCase):
    def test_empty_cart_is_rejected(self):
        with self.assertRaises(ValueError):
            calculate_sale([], D("0"))

    def test_totals_are_the_sum_of_the_lines(self):
        lines = [line("9.99", "3", "15", 1), line("0.10", "7", "5", 2), line("12.35", "1.5", "0", 3)]
        totals = calculate_sale(lines, D("7.5"))
        self.assertEqual(totals.subtotal, sum(r.line_subtotal for r in totals.lines))
        self.assertEqual(totals.discount_amount, sum(r.discount_amount for r in totals.lines))
        self.assertEqual(totals.tax_amount, sum(r.tax_amount for r in totals.lines))
        self.assertEqual(totals.total_amount, totals.subtotal - totals.discount_amount + totals.tax_amount)

    def test_mixed_vat_rates(self):
        totals = calculate_sale([line("100.00", "1", "15"), line("100.00", "1", "5"), line("100.00", "1", "0")], D("0"))
        self.assertEqual(totals.tax_amount, D("20.00"))
        self.assertEqual(totals.total_amount, D("320.00"))


class SettlePaymentTests(unittest.TestCase):
    def settle(self, total, payments, registered=True, credit="1000.00"):
        return settle_payment(D(total), [D(p) for p in payments], is_registered_customer=registered, available_credit=D(credit))

    def test_fully_paid_with_two_methods(self):
        s = self.settle("100.00", ["60.00", "40.00"], registered=False)
        self.assertEqual((s.paid_amount, s.due_amount, s.payment_status), (D("100.00"), D("0.00"), PAID))

    def test_partial_payment_leaves_a_due(self):
        s = self.settle("100.00", ["30.00"])
        self.assertEqual((s.paid_amount, s.due_amount, s.payment_status), (D("30.00"), D("70.00"), PARTIALLY_PAID))

    def test_everything_on_due(self):
        s = self.settle("100.00", [])
        self.assertEqual((s.paid_amount, s.due_amount, s.payment_status), (D("0.00"), D("100.00"), DUE))

    def test_paid_plus_due_equals_total(self):
        s = self.settle("218.50", ["100.10"])
        self.assertEqual(s.paid_amount + s.due_amount, D("218.50"))

    def test_guest_cannot_buy_on_due(self):
        with self.assertRaisesRegex(PaymentError, "Guest"):
            self.settle("100.00", ["50.00"], registered=False)

    def test_credit_limit_exceeded(self):
        with self.assertRaisesRegex(PaymentError, "Credit limit exceeded"):
            self.settle("100.00", ["10.00"], credit="89.99")

    def test_due_exactly_equal_to_available_credit_is_allowed(self):
        self.assertEqual(self.settle("100.00", ["10.00"], credit="90.00").due_amount, D("90.00"))

    def test_customer_already_over_limit_gets_no_credit(self):
        with self.assertRaisesRegex(PaymentError, "Credit limit exceeded"):
            self.settle("100.00", ["99.00"], credit="-50.00")

    def test_overpayment_and_non_positive_payments_are_rejected(self):
        with self.assertRaises(PaymentError):
            self.settle("100.00", ["100.01"])
        with self.assertRaises(PaymentError):
            self.settle("100.00", ["0.00"])


if __name__ == "__main__":
    unittest.main()
