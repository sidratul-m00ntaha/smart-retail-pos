"""Store settings (PRD 5.23): the single StoreSettings row, read by invoices, VAT, loyalty and SMS."""
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import StoreSetting, User
from app.schemas.store_setting import CURRENCY_SYMBOLS, StoreSettingsOut, StoreSettingsUpdate
from app.services.activity_log_service import log_activity

# Field -> name used in the activity log
_FIELD_LABELS = {
    "store_name": "Store name",
    "address": "Address",
    "phone": "Phone",
    "email": "Email",
    "currency_code": "Currency",
    "invoice_prefix": "Invoice prefix",
    "sms_sender_name": "SMS sender name",
}


def get_store_settings(db: Session) -> StoreSetting:
    """The store's settings. Other modules use this, e.g. for the store name and invoice prefix on invoices."""
    store = db.get(StoreSetting, 1)
    if store is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Store settings are missing. Run: python -m app.init_db",
        )
    return store


def update_store_settings(db: Session, data: StoreSettingsUpdate, current_user: User) -> StoreSetting:
    if data.sms_enabled and not data.sms_sender_name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Enter the SMS sender name to turn on SMS.")

    store = get_store_settings(db)
    changes = _describe_changes(store, data)
    if not changes:
        return store  # nothing changed, so nothing to save or log

    for field, value in data.model_dump().items():
        setattr(store, field, value)
    store.updated_by = current_user.user_id
    log_activity(
        db, current_user.user_id, "UPDATE", "StoreSetting", reference=store.store_name[:100], details="; ".join(changes)[:500]
    )
    return store


def to_store_settings_out(db: Session, store: StoreSetting) -> StoreSettingsOut:
    updated_by = db.get(User, store.updated_by) if store.updated_by is not None else None
    return StoreSettingsOut(
        store_name=store.store_name,
        address=store.address,
        phone=store.phone,
        email=store.email,
        currency_code=store.currency_code,
        currency_symbol=CURRENCY_SYMBOLS.get(store.currency_code, store.currency_code),
        invoice_prefix=store.invoice_prefix,
        default_tax_rate_id=store.default_tax_rate_id,
        loyalty_enabled=store.loyalty_enabled,
        sms_enabled=store.sms_enabled,
        sms_sender_name=store.sms_sender_name,
        updated_at=store.updated_at,
        updated_by_name=updated_by.full_name if updated_by else None,
    )


def _describe_changes(store: StoreSetting, data: StoreSettingsUpdate) -> list[str]:
    changes = []
    for field, label in _FIELD_LABELS.items():
        old, new = getattr(store, field), getattr(data, field)
        if old != new:
            changes.append(f"{label}: {old or '(empty)'} → {new or '(empty)'}")
    if data.loyalty_enabled != store.loyalty_enabled:
        changes.append("Loyalty turned on" if data.loyalty_enabled else "Loyalty turned off")
    if data.sms_enabled != store.sms_enabled:
        changes.append("SMS turned on" if data.sms_enabled else "SMS turned off")
    return changes
