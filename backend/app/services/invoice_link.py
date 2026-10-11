"""The link inside the QR code on an invoice.

The code is the invoice number plus a signature made with the server's secret key, e.g. "INV-2026-00125.9f3a...".
Nobody can work out another invoice's code from it, so only people who were given (or scanned) the QR code can open
the public invoice page. Nothing is stored: the code is calculated again whenever it is needed.
"""
import hashlib
import hmac

from app.core.config import settings

_SIGNATURE_LENGTH = 24


def _sign(invoice_number: str) -> str:
    digest = hmac.new(settings.jwt_secret_key.encode(), f"invoice:{invoice_number}".encode(), hashlib.sha256)
    return digest.hexdigest()[:_SIGNATURE_LENGTH]


def make_code(invoice_number: str) -> str:
    return f"{invoice_number}.{_sign(invoice_number)}"


def read_code(code: str) -> str | None:
    """The invoice number inside a code, or None when the code was changed or isn't one of ours."""
    invoice_number, _, signature = code.rpartition(".")
    if not invoice_number or not hmac.compare_digest(signature, _sign(invoice_number)):
        return None
    return invoice_number
