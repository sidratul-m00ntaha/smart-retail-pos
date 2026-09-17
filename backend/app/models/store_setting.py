"""StoreSettings table: always exactly one row (store_setting_id = 1)."""
from datetime import datetime

from sqlalchemy import ForeignKey, Unicode, func, text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class StoreSetting(Base):
    __tablename__ = "StoreSettings"

    store_setting_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=False)
    store_name: Mapped[str] = mapped_column(Unicode(150))
    address: Mapped[str | None] = mapped_column(Unicode(255))
    phone: Mapped[str | None] = mapped_column(Unicode(20))
    email: Mapped[str | None] = mapped_column(Unicode(255))
    currency_code: Mapped[str] = mapped_column(Unicode(3), server_default="BDT")
    invoice_prefix: Mapped[str] = mapped_column(Unicode(10), server_default="INV")
    # Becomes a link to TaxRates once Module 2's TaxRates table exists
    default_tax_rate_id: Mapped[int | None]
    loyalty_enabled: Mapped[bool] = mapped_column(server_default=text("1"))
    sms_enabled: Mapped[bool] = mapped_column(server_default=text("0"))
    sms_sender_name: Mapped[str | None] = mapped_column(Unicode(20))
    updated_by: Mapped[int | None] = mapped_column(ForeignKey("Users.user_id"))
    created_at: Mapped[datetime] = mapped_column(server_default=func.sysutcdatetime())
    updated_at: Mapped[datetime | None] = mapped_column(onupdate=func.sysutcdatetime())