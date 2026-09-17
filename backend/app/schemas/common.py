"""Small building blocks shared by every module's schemas."""
from datetime import datetime, timezone
from typing import Annotated

from pydantic import AfterValidator


def _mark_as_utc(value: datetime) -> datetime:
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value


# Use for date/time fields in API responses. The database stores UTC without a time zone;
# this adds the "Z" marker so the frontend shows the correct local time.
UtcDateTime = Annotated[datetime, AfterValidator(_mark_as_utc)]
