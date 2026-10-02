"""The sale SMS follows the store's SMS setting, needs a phone number, and never breaks a sale.
Uses a throwaway in-memory database, never your Docker one.

Run from the backend folder:  python -m unittest tests.test_sms_setting -v
"""
import unittest
from decimal import Decimal as D
from unittest.mock import patch

from app.models import StoreSetting
from app.services.notification_service import notify_sale_completed, sms_is_enabled
from tests.test_complete_sale import make_session

LOGGER = "app.services.notification_service"


class SmsSettingTests(unittest.TestCase):
    def setUp(self):
        self.db = make_session()

    def tearDown(self):
        engine = self.db.get_bind()
        self.db.close()
        engine.dispose()

    def test_follows_the_store_setting(self):
        store = self.db.get(StoreSetting, 1)
        store.sms_enabled = True
        self.db.commit()
        self.assertTrue(sms_is_enabled(self.db))
        store.sms_enabled = False
        self.db.commit()
        self.assertFalse(sms_is_enabled(self.db))

    def test_no_phone_means_no_sms(self):
        with self.assertNoLogs(LOGGER, level="INFO"):
            notify_sale_completed(None, "INV-2026-00001", D("100.00"))

    def test_sms_is_sent_when_there_is_a_phone(self):
        with self.assertLogs(LOGGER, level="INFO") as logs:
            notify_sale_completed("01700000000", "INV-2026-00001", D("100.00"))
        self.assertIn("INV-2026-00001", logs.output[0])

    def test_a_failing_sms_never_raises(self):
        with patch("app.services.notification_service.send_sms", side_effect=RuntimeError("provider down")):
            with self.assertLogs(LOGGER, level="ERROR"):
                notify_sale_completed("01700000000", "INV-2026-00001", D("100.00"))


if __name__ == "__main__":
    unittest.main()
