"""SMS after a sale (PRD 5.18). STAND-IN: it only writes to the log until an SMS provider is chosen.

Call notify_sale_completed() only AFTER the sale is committed (for example as a FastAPI background
task). It never raises, so a failed SMS can never block or undo a sale.
"""
import logging
from decimal import Decimal

logger = logging.getLogger(__name__)


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
