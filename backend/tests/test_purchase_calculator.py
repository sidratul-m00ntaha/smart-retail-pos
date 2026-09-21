# """Run from the backend folder:  python -m unittest tests.test_purchase_calculator -v"""
# import unittest
# from decimal import Decimal as D

# from app.services.purchase_calculator import (
#     DUE,
#     PAID,
#     PARTIALLY_PAID,
#     LineInput,
#     PurchaseError,
#     calculate_line,
#     calculate_purchase,
#     money,
#     payment_status_for,
#     settle_payment,
# )


# def line(qty: str, price: str, discount: str = "0", product_id: int = 1) -> LineInput:
#     return LineInput(product_id=product_id, quantity=D(qty), unit_price=D(price), line_discount_percent=D(discount))


# class CalculateLineTests(unittest.TestCase):
#     def test_line_total_without_discount(self):
#         self.assertEqual(calculate_line(line("10", "100.00")).line_total, D("1000.00"))

#     def test_line_discount_percent(self):
#         self.assertEqual(calculate_line(line("5", "40.00", "10")).line_total, D("180.00"))

#     def test_rounds_half_up_not_bankers(self):
#         self.assertEqual(money(D("0.005")), D("0.01"))
#         self.assertEqual(calculate_line(line("1", "0.10", "5")).line_total, D("0.10"))  # 0.095 -> 0.10

#     def test_float_is_rejected(self):
#         with self.assertRaises(TypeError):
#             calculate_line(LineInput(1, D("1"), 9.99, D("0")))  # type: ignore[arg-type]

#     def test_bad_values_are_rejected(self):
#         for bad in (line("0", "10.00"), line("1", "0"), line("1", "10.00", "101"), line("1", "10.00", "-1")):
#             with self.assertRaises(PurchaseError):
#                 calculate_line(bad)


# class CalculatePurchaseTests(unittest.TestCase):
#     def test_follows_the_prd_formula(self):
#         # lines: 1000.00 + 180.00 = 1180.00 subtotal; VAT 15% of the subtotal = 177.00
#         totals = calculate_purchase([line("10", "100.00"), line("5", "40.00", "10", 2)], D("80.00"), D("15"), D("50.00"))
#         self.assertEqual(totals.subtotal, D("1180.00"))
#         self.assertEqual(totals.tax_amount, D("177.00"))
#         self.assertEqual(totals.total_amount, D("1327.00"))  # 1180 - 80 + 177 + 50

#     def test_totals_are_the_sum_of_the_lines(self):
#         lines = [line("3", "9.99", "2.5", 1), line("7", "0.10", "0", 2), line("2", "12.35", "10", 3)]
#         totals = calculate_purchase(lines, D("1.00"), D("5"), D("0"))
#         self.assertEqual(totals.subtotal, sum(r.line_total for r in totals.lines))
#         self.assertEqual(totals.total_amount, totals.subtotal - totals.discount_amount + totals.tax_amount)

#     def test_no_vat_no_discount_no_shipping(self):
#         totals = calculate_purchase([line("2", "50.00")], D("0"), D("0"), D("0"))
#         self.assertEqual(totals.total_amount, D("100.00"))

#     def test_rules_are_enforced(self):
#         with self.assertRaises(PurchaseError):
#             calculate_purchase([], D("0"), D("0"), D("0"))
#         with self.assertRaisesRegex(PurchaseError, "discount"):
#             calculate_purchase([line("1", "10.00")], D("10.01"), D("0"), D("0"))
#         with self.assertRaises(PurchaseError):
#             calculate_purchase([line("1", "10.00")], D("0"), D("101"), D("0"))
#         with self.assertRaises(PurchaseError):
#             calculate_purchase([line("1", "10.00")], D("-1"), D("0"), D("0"))
#         with self.assertRaises(PurchaseError):
#             calculate_purchase([line("1", "10.00")], D("0"), D("0"), D("-1"))


# class SettlePaymentTests(unittest.TestCase):
#     def test_paid_in_full(self):
#         s = settle_payment(D("100.00"), D("100.00"))
#         self.assertEqual((s.paid_amount, s.due_amount, s.payment_status), (D("100.00"), D("0.00"), PAID))

#     def test_partly_paid_leaves_a_due(self):
#         s = settle_payment(D("100.00"), D("30.00"))
#         self.assertEqual((s.paid_amount, s.due_amount, s.payment_status), (D("30.00"), D("70.00"), PARTIALLY_PAID))

#     def test_nothing_paid(self):
#         s = settle_payment(D("100.00"), D("0"))
#         self.assertEqual((s.paid_amount, s.due_amount, s.payment_status), (D("0.00"), D("100.00"), DUE))

#     def test_paid_plus_due_equals_total(self):
#         s = settle_payment(D("218.50"), D("100.10"))
#         self.assertEqual(s.paid_amount + s.due_amount, D("218.50"))

#     def test_overpayment_and_negative_payment_are_rejected(self):
#         with self.assertRaisesRegex(PurchaseError, "more than"):
#             settle_payment(D("100.00"), D("100.01"))
#         with self.assertRaisesRegex(PurchaseError, "negative"):
#             settle_payment(D("100.00"), D("-1"))

#     def test_payment_status_for(self):
#         self.assertEqual(payment_status_for(D("50"), D("50")), PAID)
#         self.assertEqual(payment_status_for(D("50"), D("0")), DUE)
#         self.assertEqual(payment_status_for(D("50"), D("10")), PARTIALLY_PAID)


# if __name__ == "__main__":
#     unittest.main()

























"""Run from the backend folder:  python -m unittest tests.test_purchase_calculator -v"""
import unittest
from decimal import Decimal as D

from app.services.purchase_calculator import (
    DUE,
    PAID,
    PARTIALLY_PAID,
    LineInput,
    PurchaseError,
    calculate_line,
    calculate_purchase,
    money,
    payment_status_for,
    settle_payment,
)


def line(qty: str, price: str, discount: str = "0", product_id: int = 1) -> LineInput:
    return LineInput(product_id=product_id, quantity=D(qty), unit_price=D(price), line_discount_percent=D(discount))


class CalculateLineTests(unittest.TestCase):
    def test_line_total_without_discount(self):
        self.assertEqual(calculate_line(line("10", "100.00")).line_total, D("1000.00"))

    def test_line_discount_percent(self):
        self.assertEqual(calculate_line(line("5", "40.00", "10")).line_total, D("180.00"))

    def test_rounds_half_up_not_bankers(self):
        self.assertEqual(money(D("0.005")), D("0.01"))
        self.assertEqual(calculate_line(line("1", "0.10", "5")).line_total, D("0.10"))  # 0.095 -> 0.10

    def test_float_is_rejected(self):
        with self.assertRaises(TypeError):
            calculate_line(LineInput(1, D("1"), 9.99, D("0")))  # type: ignore[arg-type]

    def test_bad_values_are_rejected(self):
        for bad in (line("0", "10.00"), line("1", "0"), line("1", "10.00", "101"), line("1", "10.00", "-1")):
            with self.assertRaises(PurchaseError):
                calculate_line(bad)


class CalculatePurchaseTests(unittest.TestCase):
    def test_follows_the_prd_formula(self):
        # lines: 1000.00 + 180.00 = 1180.00 subtotal; VAT 15% of the subtotal = 177.00
        totals = calculate_purchase([line("10", "100.00"), line("5", "40.00", "10", 2)], D("80.00"), D("15"), D("50.00"))
        self.assertEqual(totals.subtotal, D("1180.00"))
        self.assertEqual(totals.tax_amount, D("177.00"))
        self.assertEqual(totals.total_amount, D("1327.00"))  # 1180 - 80 + 177 + 50

    def test_totals_are_the_sum_of_the_lines(self):
        lines = [line("3", "9.99", "2.5", 1), line("7", "0.10", "0", 2), line("2", "12.35", "10", 3)]
        totals = calculate_purchase(lines, D("1.00"), D("5"), D("0"))
        self.assertEqual(totals.subtotal, sum(r.line_total for r in totals.lines))
        self.assertEqual(totals.total_amount, totals.subtotal - totals.discount_amount + totals.tax_amount)

    def test_no_vat_no_discount_no_shipping(self):
        totals = calculate_purchase([line("2", "50.00")], D("0"), D("0"), D("0"))
        self.assertEqual(totals.total_amount, D("100.00"))

    def test_rules_are_enforced(self):
        with self.assertRaises(PurchaseError):
            calculate_purchase([], D("0"), D("0"), D("0"))
        with self.assertRaisesRegex(PurchaseError, "discount"):
            calculate_purchase([line("1", "10.00")], D("10.01"), D("0"), D("0"))
        with self.assertRaises(PurchaseError):
            calculate_purchase([line("1", "10.00")], D("0"), D("101"), D("0"))
        with self.assertRaises(PurchaseError):
            calculate_purchase([line("1", "10.00")], D("-1"), D("0"), D("0"))
        with self.assertRaises(PurchaseError):
            calculate_purchase([line("1", "10.00")], D("0"), D("0"), D("-1"))


class SettlePaymentTests(unittest.TestCase):
    def test_paid_in_full(self):
        s = settle_payment(D("100.00"), D("100.00"))
        self.assertEqual((s.paid_amount, s.due_amount, s.payment_status), (D("100.00"), D("0.00"), PAID))

    def test_partly_paid_leaves_a_due(self):
        s = settle_payment(D("100.00"), D("30.00"))
        self.assertEqual((s.paid_amount, s.due_amount, s.payment_status), (D("30.00"), D("70.00"), PARTIALLY_PAID))

    def test_nothing_paid(self):
        s = settle_payment(D("100.00"), D("0"))
        self.assertEqual((s.paid_amount, s.due_amount, s.payment_status), (D("0.00"), D("100.00"), DUE))

    def test_paid_plus_due_equals_total(self):
        s = settle_payment(D("218.50"), D("100.10"))
        self.assertEqual(s.paid_amount + s.due_amount, D("218.50"))

    def test_overpayment_and_negative_payment_are_rejected(self):
        with self.assertRaisesRegex(PurchaseError, "more than"):
            settle_payment(D("100.00"), D("100.01"))
        with self.assertRaisesRegex(PurchaseError, "negative"):
            settle_payment(D("100.00"), D("-1"))

    def test_payment_status_for(self):
        self.assertEqual(payment_status_for(D("50"), D("50")), PAID)
        self.assertEqual(payment_status_for(D("50"), D("0")), DUE)
        self.assertEqual(payment_status_for(D("50"), D("10")), PARTIALLY_PAID)


if __name__ == "__main__":
    unittest.main()