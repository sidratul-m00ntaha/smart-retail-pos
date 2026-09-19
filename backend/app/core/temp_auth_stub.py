"""
TEMPORARY. Delete this file once Module 1 delivers app/core/dependencies.py
with the real get_current_user().

Gives you a fake logged-in user so you can build and test Module 3 endpoints
without waiting on auth. When Module 1 lands, change the two import lines in
routers/suppliers.py and routers/purchases.py from:
    from app.core.temp_auth_stub import get_current_user, CurrentUser
to:
    from app.core.dependencies import get_current_user, CurrentUser
Nothing else needs to change, as long as the real one returns UserID and Role.
"""
from typing import TypedDict


class CurrentUser(TypedDict):
    UserID: int
    Role: str


def get_current_user() -> CurrentUser:
    return {"UserID": 1, "Role": "Manager"}
