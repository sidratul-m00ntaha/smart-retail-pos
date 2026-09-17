"""Store settings endpoints: /api/settings (PRD 5.23)."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_permission
from app.database import get_db
from app.models import User
from app.schemas.store_setting import StoreSettingsOut, StoreSettingsUpdate
from app.services import store_setting_service

router = APIRouter(prefix="/api/settings", tags=["Store Settings"])


@router.get("", response_model=StoreSettingsOut)
def get_store_settings(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Store name, contact details, currency, invoice prefix, loyalty and SMS switches.

    Any logged-in user may read them - the POS and invoices need them.
    """
    return store_setting_service.to_store_settings_out(db, store_setting_service.get_store_settings(db))


@router.put("", response_model=StoreSettingsOut)
def update_store_settings(
    data: StoreSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("settings.manage")),
):
    """Change the store settings. Admins only."""
    store = store_setting_service.update_store_settings(db, data, current_user)
    db.commit()
    return store_setting_service.to_store_settings_out(db, store)
