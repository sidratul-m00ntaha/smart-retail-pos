"""The new endpoints called over HTTP, the way the browser calls them: wallet payments, the public invoice page and the
end-of-day closing. Throwaway in-memory database, never your Docker one.

Run from the backend folder:  python -m unittest tests.test_extra_features_api -v
"""
import unittest
from datetime import timedelta

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import sessionmaker

from app.core.security import create_access_token
from app.database import get_db
from app.init_db import seed_roles_and_permissions
from app.main import app
from app.models import Role, User
from app.models.stock import ProductStock
from app.services.day_close_service import store_today
from tests.test_complete_sale import make_session


class ExtraFeaturesApiTests(unittest.TestCase):
    def setUp(self):
        self.db = make_session()
        seed_roles_and_permissions(self.db)
        roles = {role.name: role.role_id for role in self.db.scalars(select(Role))}
        self.db.add_all([ProductStock(product_id=pid, current_stock=50) for pid in (1, 2, 3)])
        self.db.add_all([
            User(full_name="Admin Person", username="admin", email="a@example.com", password_hash="x", role_id=roles["Admin"]),
            User(full_name="Cash Person", username="cashier", email="c@example.com", password_hash="x", role_id=roles["Cashier"]),
        ])
        self.db.commit()
        users = {user.username: user.user_id for user in self.db.scalars(select(User))}
        self.admin = {"Authorization": f"Bearer {create_access_token(users['admin'])}"}
        self.cashier = {"Authorization": f"Bearer {create_access_token(users['cashier'])}"}

        factory = sessionmaker(self.db.get_bind())

        def override_get_db():
            session = factory()
            try:
                yield session
            finally:
                session.close()

        app.dependency_overrides[get_db] = override_get_db
        self.client = TestClient(app)  # not used as a context manager, so the real database's startup code never runs

    def tearDown(self):
        app.dependency_overrides.clear()
        engine = self.db.get_bind()
        self.db.close()
        engine.dispose()

    def sell(self, payments, headers=None):
        return self.client.post("/api/sales", json={"items": [{"product_id": 2, "quantity": "1"}], "payments": payments}, headers=headers or self.cashier)

    def test_a_bkash_sale_returns_the_transaction_id_and_a_share_code(self):
        response = self.sell([{"method": "cash", "amount": "50.00"}, {"method": "bkash", "amount": "400.00", "reference": "8n7a6d5ee7"}])
        self.assertEqual(response.status_code, 201, response.text)
        sale = response.json()
        self.assertEqual({p["method"]: p["reference"] for p in sale["payments"]}, {"cash": None, "bkash": "8N7A6D5EE7"})
        self.assertEqual((sale["total_amount"], sale["payment_status"]), ("450.00", "PAID"))  # money is sent as strings
        self.assertTrue(sale["share_code"].startswith(sale["invoice_number"] + "."))

    def test_a_wallet_payment_without_a_transaction_id_is_refused(self):
        self.assertEqual(self.sell([{"method": "nagad", "amount": "450.00"}]).status_code, 422)

    def test_a_used_transaction_id_is_refused_with_a_clear_message(self):
        self.assertEqual(self.sell([{"method": "rocket", "amount": "450.00", "reference": "SAME1234"}]).status_code, 201)
        second = self.sell([{"method": "rocket", "amount": "450.00", "reference": "same1234"}])
        self.assertEqual(second.status_code, 409)
        self.assertIn("already used", second.json()["detail"])

    def test_the_public_invoice_opens_without_a_login_and_hides_private_details(self):
        sale = self.sell([{"method": "bkash", "amount": "450.00", "reference": "PUB00001"}]).json()
        page = self.client.get(f"/api/public/invoices/{sale['share_code']}")  # no Authorization header
        self.assertEqual(page.status_code, 200, page.text)
        invoice = page.json()
        self.assertEqual((invoice["invoice_number"], invoice["total_amount"]), (sale["invoice_number"], "450.00"))
        self.assertEqual(invoice["payments"][0]["reference"], "PUB00001")
        for private in ("cashier_id", "cashier_name", "customer_phone", "customer_id", "sale_id", "share_code"):
            self.assertNotIn(private, invoice)

    def test_a_wrong_public_code_is_404(self):
        sale = self.sell([{"method": "cash", "amount": "450.00"}]).json()
        for code in ("nonsense", sale["invoice_number"], sale["invoice_number"] + ".000000000000000000000000"):
            self.assertEqual(self.client.get(f"/api/public/invoices/{code}").status_code, 404, code)

    def test_day_close_over_http(self):
        self.sell([{"method": "cash", "amount": "450.00"}])
        self.sell([{"method": "bkash", "amount": "450.00", "reference": "DAY00001"}])

        self.assertEqual(self.client.get("/api/day-close").status_code, 401)
        self.assertEqual(self.client.get("/api/day-close", headers=self.cashier).status_code, 403)  # cashiers can't see the day's figures

        report = self.client.get("/api/day-close", headers=self.admin).json()
        self.assertEqual((report["totals"]["transactions"], report["totals"]["gross_sales"], report["cash_net"]), (2, "900.00", "450.00"))
        self.assertEqual([m["method"] for m in report["methods"]], ["cash", "bkash"])
        self.assertIsNone(report["closing"])

        saved = self.client.post("/api/day-close", json={"opening_cash": "100.00", "counted_cash": "545.00", "note": "5 short"}, headers=self.admin)
        self.assertEqual(saved.status_code, 200, saved.text)
        closing = saved.json()["closing"]
        self.assertEqual((closing["expected_cash"], closing["difference"], closing["closed_by_name"]), ("550.00", "-5.00", "Admin Person"))

    def test_day_close_for_another_day(self):
        yesterday = (store_today() - timedelta(days=1)).isoformat()
        self.assertEqual(self.client.get(f"/api/day-close?date={yesterday}", headers=self.admin).json()["totals"]["transactions"], 0)
        tomorrow = (store_today() + timedelta(days=1)).isoformat()
        self.assertEqual(self.client.get(f"/api/day-close?date={tomorrow}", headers=self.admin).status_code, 400)

    def test_a_bad_count_is_refused(self):
        response = self.client.post("/api/day-close", json={"opening_cash": "0", "counted_cash": "-5"}, headers=self.admin)
        self.assertEqual(response.status_code, 422)


if __name__ == "__main__":
    unittest.main()
