import unittest
from decimal import Decimal

from app.services.invoice_service import apply_credit

D = Decimal


class ApplyCreditTests(unittest.TestCase):
    def test_pays_oldest_sale_first(self):
        left = apply_credit([(3, D("1448.79")), (7, D("378.64"))], D("1000.00"))
        self.assertEqual(left, {3: D("448.79"), 7: D("378.64")})

    def test_moves_on_to_the_next_sale(self):
        left = apply_credit([(3, D("1448.79")), (7, D("378.64"))], D("1600.00"))
        self.assertEqual(left, {3: D("0.00"), 7: D("227.43")})

    def test_no_credit_changes_nothing(self):
        self.assertEqual(apply_credit([(3, D("10.00"))], D("0")), {3: D("10.00")})

    def test_extra_credit_is_not_spread_further(self):
        self.assertEqual(apply_credit([(3, D("10.00"))], D("50.00")), {3: D("0.00")})


if __name__ == "__main__":
    unittest.main()
