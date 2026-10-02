"""SMS after a sale (PRD 5.18). STAND-IN: it only writes to the log until an SMS provider is chosen.

Call notify_sale_completed() only AFTER the sale is committed (for example as a FastAPI background
task). It never raises, so a failed SMS can never block or undo a sale.

The SMS is only attempted when the store has SMS switched on (Settings, Module 1: sms_enabled; see
sms_is_enabled) and the customer has a phone number.
"""
import logging
from decimal import Decimal

from sqlalchemy.orm import Session

from app.services.store_setting_service import get_store_settings

logger = logging.getLogger(__name__)


def sms_is_enabled(db: Session) -> bool:
    """The store's "SMS enabled" setting. Never raises: a problem here must not affect a sale that is already saved."""
    try:
        return bool(get_store_settings(db).sms_enabled)
    except Exception:  # noqa: BLE001
        logger.exception("Could not read the SMS setting, so no SMS will be sent")
        return False


def send_sms(phone: str, message: str) -> None:
    """Replace the body with the real provider call later."""
    logger.info("SMS (stand-in) to %s: %s", phone, message)


def notify_sale_completed(phone: str | None, invoice_number: str, total_amount: Decimal) -> None:
    if not phone:
        return
    try:
        send_sms(phone, f"Thank you for shopping with us. Invoice {invoice_number}, total {total_amount}.")
    except Exception:  # noqa: BLE001 - an SMS problem must never affect the sale
        logger.exception("Could not send the sale SMS for invoice %s", invoice_number)
